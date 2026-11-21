import { Inject, Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type {
  SettingDefinition,
  SettingValue,
  UiEvent,
  UiNode,
  UiPage,
  UiScope,
  UiSection,
  UiTree,
} from '@awake/contracts';
import { type BotMenu, type BotNamespace, BotRouterService } from '../bot';
import { BotJournalService, type BotEventCreate } from '../bot-journal';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { SettingsService } from '../settings/settings.service';
import { buildSettingNode } from './helpers/build-setting-node';
import { filterNodesByScope } from './helpers/filter-nodes-by-scope';
import { isVisibleInScope } from './helpers/is-visible-in-scope';
import { isValidSettingValue } from './helpers/is-valid-setting-value';
import { resolveSettingValue } from './helpers/resolve-setting-value';
import { MACONTROL_BOT } from './constants/macontrol-bot';
import { MAC_MODULES, type MacModule, type ModuleContext, type ModulesStatus, type StatusFields } from './types/mac-module';
import type { ModuleSource } from './types/module-source';

/** Реєстр модулів MaControl: з них будується дерево UI і сюди приходять дії та налаштування. */
@Injectable()
export class ModulesService {
  readonly settingChanged$ = new Subject<{ module: string; key: string; value: SettingValue }>();
  /** Стан модуля змінився поза Mac і налаштуваннями (напр. viewer relay): дерево треба перебудувати. */
  readonly treeChanged$ = new Subject<void>();
  private readonly _byId: Map<string, MacModule>;

  constructor(
    @Inject(MAC_MODULES) modules: MacModule[],
    private readonly _bridge: MacBridgeService,
    private readonly _settings: SettingsService,
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
  ) {
    this._byId = new Map(modules.map((module) => [module.id, module]));
  }

  list(): MacModule[] {
    return [...this._byId.values()];
  }

  context(moduleId: string): ModuleContext {
    const module = this._find(moduleId);
    // Звичайний get-аксесор у літералі бачить сам літерал, тож сервіс беремо в змінну.
    const bridge = this._bridge;
    return {
      get mac() {
        return bridge.state;
      },
      setting: <T extends SettingValue>(key: string) => this._readSetting(module, key) as T,
      settingNode: (key: string, ofModule?: string): UiNode => {
        const owner = ofModule ? this._find(ofModule) : module;
        return buildSettingNode(owner.id, this._definition(owner, key), this._readSetting(owner, key));
      },
      sendToMac: (command, source) => {
        bridge.sendCommand(command, source);
      },
      status: () => this.status(),
    };
  }

  /** Спільний стан: кожен модуль пише у свій ключ. Поля з null відкидаються, модуль без полів — без ключа. */
  status(): ModulesStatus {
    const status: ModulesStatus = {};
    for (const module of this._byId.values()) {
      const entries = Object.entries(module.status?.(this.context(module.id)) ?? {}).filter(([, value]) => value !== null);
      if (entries.length > 0) status[module.id] = Object.fromEntries(entries) as StatusFields;
    }
    return status;
  }

  async buildTree(scope: UiScope): Promise<UiTree> {
    const mac = this._bridge.state;
    const pages: UiPage[] = [];
    for (const module of this._byId.values()) {
      pages.push(...(await module.pages(this.context(module.id))));
    }
    pages.push(this._settingsPage());

    const visible = pages
      .filter((page) => isVisibleInScope(page, scope))
      .map((page) => ({ ...page, children: filterNodesByScope(page.children, scope) }));

    return {
      modules: this.list().map((module) => ({
        id: module.id,
        title: module.title,
        icon: module.icon,
        permissions: module.permissions,
      })),
      app: {
        title: 'MaControl',
        host: mac?.host ?? 'Mac',
        online: mac !== null,
        updatedAt: new Date().toISOString(),
      },
      pages: visible,
    };
  }

  /** Namespace-и бота MaControl (модулі з `@Bot`): команди й стартовий екран Telegram. */
  botNamespaces(): BotNamespace[] {
    return this._router.namespaces(MACONTROL_BOT);
  }

  /** Екран бота модуля з його контекстом; невідомий шлях — головний. */
  async screen(moduleId: string, screen: string, source: ModuleSource): Promise<BotMenu | null> {
    return this._journaled({ source, type: 'screen', namespace: moduleId, name: screen }, () => this._screen(moduleId, screen, source));
  }

  /**
   * Кнопка SDUI, Telegram чи Mac: дія йде в `@BotAction` модуля (namespace = id модуля),
   * налаштування — в SettingsService. Кожен виклик іде в журнал бота з джерелом і проксі (`via.proxy`), якщо він був.
   */
  async dispatch(event: UiEvent, source: ModuleSource, via: { proxy?: string } = {}): Promise<void> {
    const proxy = via.proxy ?? null;
    const entry: BotEventCreate =
      event.type === 'action'
        ? { source, proxy, type: 'action', namespace: event.action.module, name: event.action.name }
        : { source, proxy, type: 'setting', namespace: event.change.module, name: `${event.change.key} = ${String(event.change.value)}` };
    await this._journaled(entry, () => this._dispatch(event, source));
  }

  /** Виконує виклик і пише його в журнал бота з результатом; помилку пробрасує далі. */
  private async _journaled<T>(entry: BotEventCreate, run: () => Promise<T>): Promise<T> {
    try {
      const result = await run();
      this._journal.record(entry);
      return result;
    } catch (error) {
      this._journal.record({ ...entry, ok: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async _screen(moduleId: string, screen: string, source: ModuleSource): Promise<BotMenu | null> {
    this._find(moduleId);
    return this._router.screen({
      bot: MACONTROL_BOT,
      namespace: moduleId,
      name: screen,
      params: {},
      source,
      context: this.context(moduleId),
    });
  }

  private async _dispatch(event: UiEvent, source: ModuleSource): Promise<void> {
    if (event.type === 'action') {
      const { module: moduleId, name, params } = event.action;
      this._find(moduleId);
      if (!this._router.hasAction(MACONTROL_BOT, moduleId, name)) {
        throw new AppException(API_ERROR_CODES.invalidCommand, `Unknown action ${moduleId}.${name}`);
      }
      await this._router.action({
        bot: MACONTROL_BOT,
        namespace: moduleId,
        name,
        params: params ?? {},
        source,
        context: this.context(moduleId),
      });
      return;
    }

    const { module: moduleId, key, value } = event.change;
    const module = this._find(moduleId);
    const definition = module.settings.find((setting) => setting.key === key);
    if (!definition || !isValidSettingValue(definition, value)) {
      throw new AppException(API_ERROR_CODES.invalidCommand, `Invalid setting ${moduleId}.${key}`);
    }
    // Налаштування SwiftUI міняють лише Mac і Telegram, не вебдашборд — ні напряму, ні через проксі.
    if (definition.scope === 'mac' && source === 'web') {
      throw new AppException(API_ERROR_CODES.invalidCommand, `Setting ${moduleId}.${key} is Mac-only`);
    }
    this._settings.set(moduleId, key, value);
    this.settingChanged$.next({ module: moduleId, key, value });
    await module.onSettingChanged?.(key, value, this.context(moduleId));
  }

  /** Усі налаштування як `<module>.<key>` → значення (з default): знімок для Mac-аппки. */
  settingsSnapshot(): Record<string, SettingValue> {
    const snapshot: Record<string, SettingValue> = {};
    for (const module of this._byId.values()) {
      for (const definition of module.settings) {
        snapshot[`${module.id}.${definition.key}`] = this._readSetting(module, definition.key);
      }
    }
    return snapshot;
  }

  private _find(moduleId: string): MacModule {
    const module = this._byId.get(moduleId);
    if (!module) throw new AppException(API_ERROR_CODES.invalidCommand, `Unknown module ${moduleId}`);
    return module;
  }

  private _definition(module: MacModule, key: string): SettingDefinition {
    const definition = module.settings.find((setting) => setting.key === key);
    if (!definition) throw new Error(`Unknown setting ${module.id}.${key}`);
    return definition;
  }

  private _readSetting(module: MacModule, key: string): SettingValue {
    return resolveSettingValue(this._definition(module, key), this._settings.get(module.id, key));
  }

  /** Налаштування з полем page показує сама сторінка модуля, тому на «Налаштуваннях» їх немає. */
  private _settingsPage(): UiPage {
    const sections: UiSection[] = [];
    for (const module of this._byId.values()) {
      const definitions = module.settings.filter((definition) => definition.page === undefined);
      if (definitions.length === 0) continue;
      sections.push({
        id: `settings-${module.id}`,
        type: 'section',
        title: module.title,
        children: definitions.map((definition) =>
          buildSettingNode(module.id, definition, this._readSetting(module, definition.key)),
        ),
      });
    }
    const children: UiNode[] =
      sections.length > 0 ? sections : [{ id: 'settings-empty', type: 'text', text: 'Загальних налаштувань поки немає' }];
    return {
      id: 'settings',
      module: 'host',
      title: 'Налаштування',
      icon: { symbol: 'gearshape.fill', tone: 'gray' },
      group: 'system',
      children,
    };
  }
}

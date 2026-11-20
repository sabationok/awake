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
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { SettingsService } from '../settings/settings.service';
import { buildSettingNode } from './helpers/build-setting-node';
import { filterNodesByScope } from './helpers/filter-nodes-by-scope';
import { isValidSettingValue } from './helpers/is-valid-setting-value';
import { resolveSettingValue } from './helpers/resolve-setting-value';
import { MAC_MODULES, type MacModule, type ModuleContext } from './types/mac-module';

type Source = 'mac' | 'telegram' | 'web';

/** Реєстр модулів MacCC: з них будується дерево UI і сюди приходять дії та налаштування. */
@Injectable()
export class ModulesService {
  readonly settingChanged$ = new Subject<{ module: string; key: string; value: SettingValue }>();
  private readonly _byId: Map<string, MacModule>;

  constructor(
    @Inject(MAC_MODULES) modules: MacModule[],
    private readonly _bridge: MacBridgeService,
    private readonly _settings: SettingsService,
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
      settingNode: (key: string): UiNode =>
        buildSettingNode(module.id, this._definition(module, key), this._readSetting(module, key)),
      sendToMac: (command, source) => {
        bridge.sendCommand(command, source);
      },
    };
  }

  async buildTree(scope: UiScope): Promise<UiTree> {
    const mac = this._bridge.state;
    const pages: UiPage[] = [];
    for (const module of this._byId.values()) {
      pages.push(...(await module.pages(this.context(module.id))));
    }
    pages.push(this._settingsPage());

    const visible = pages
      .filter((page) => scope === 'local' || page.scope !== 'local')
      .map((page) => ({ ...page, children: filterNodesByScope(page.children, scope) }));

    return {
      modules: this.list().map((module) => ({
        id: module.id,
        title: module.title,
        icon: module.icon,
        permissions: module.permissions,
      })),
      app: {
        title: 'MacCC',
        host: mac?.host ?? 'Mac',
        online: mac !== null,
        updatedAt: new Date().toISOString(),
      },
      pages: visible,
    };
  }

  async dispatch(event: UiEvent, source: Source): Promise<void> {
    if (event.type === 'action') {
      const { module: moduleId, name, params } = event.action;
      const module = this._find(moduleId);
      // Object.hasOwn, щоб імена на кшталт `constructor` не знаходили прототип.
      if (!Object.hasOwn(module.actions, name)) {
        throw new AppException(API_ERROR_CODES.invalidCommand, `Unknown action ${moduleId}.${name}`);
      }
      await module.actions[name](params ?? {}, this.context(moduleId), source);
      return;
    }

    const { module: moduleId, key, value } = event.change;
    const module = this._find(moduleId);
    const definition = module.settings.find((setting) => setting.key === key);
    if (!definition || !isValidSettingValue(definition, value)) {
      throw new AppException(API_ERROR_CODES.invalidCommand, `Invalid setting ${moduleId}.${key}`);
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

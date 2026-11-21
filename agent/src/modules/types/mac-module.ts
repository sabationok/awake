import type { CommandRequest, MacPermission, MacState, SettingDefinition, SettingValue, UiNode, UiPage } from '@awake/contracts';
import type { ModuleSource } from './module-source';

/**
 * Що модуль отримує від хоста. Модуль не лізе в SQLite, stdin чи Upstash напряму:
 * лише через ці методи.
 */
export interface ModuleContext {
  /** Останній стан від Mac-аппки або null, якщо Mac мовчить. */
  mac: MacState | null;
  /** Значення налаштування цього модуля (вже з default). */
  setting<T extends SettingValue>(key: string): T;
  /**
   * Готовий вузол switch/select з поточним значенням, щоб поставити налаштування на свою сторінку.
   * `ofModule` — налаштування іншого модуля (напр. перемикач webhooxy на сторінці Агента); зміна йде власнику.
   */
  settingNode(key: string, ofModule?: string): UiNode;
  /** Команда для Mac-аппки (сон, блокування, екран). */
  sendToMac(command: CommandRequest, source: ModuleSource): void;
  /** Спільний стан для /status: кожен модуль під своїм id, у порядку модулів. */
  status(): ModulesStatus;
}

/** Поля модуля в /status. Поля з null не потрапляють у вивід. */
export type StatusFields = Record<string, string | number | boolean | null>;

/** /status: `{ <id модуля>: його поля }`. Модуля, якому нема що писати, тут немає. */
export type ModulesStatus = Record<string, StatusFields>;

/**
 * Плагін MaControl: сторінки, налаштування і стан. Дії та екрани бота — окремий клас `@Bot(MACONTROL_BOT, { namespace: id })`.
 */
export interface MacModule {
  id: string;
  title: string;
  icon: { symbol: string; tone: import('@awake/contracts').UiTone };
  /** Системні дозволи Mac, які модуль просить. Mac показує їх окремо по модулях і дає лише дозволені. */
  permissions: MacPermission[];
  /** Налаштування, які хост покаже в «Налаштуваннях» і збереже як `<id>.<key>`. */
  settings: SettingDefinition[];
  /** Вкладки модуля в бічному меню. Будуються з поточного стану щоразу. */
  pages(ctx: ModuleContext): UiPage[] | Promise<UiPage[]>;
  /** Поля модуля в /status під ключем його id. null або без значень — ключа немає. */
  status?(ctx: ModuleContext): StatusFields | null;
  /** Налаштування змінилось (вже збережене). Напр. Awake пересилає його в Mac-аппку. */
  onSettingChanged?(key: string, value: string | number | boolean, ctx: ModuleContext): void | Promise<void>;
}

/** Список модулів: { provide: MAC_MODULES, useFactory: (...m) => m, inject: [AwakeMacModule, …] } у ModulesModule. */
export const MAC_MODULES = Symbol('MAC_MODULES');

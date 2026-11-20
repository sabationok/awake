import type { CommandRequest, MacPermission, MacState, SettingDefinition, SettingValue, UiNode, UiPage } from '@awake/contracts';

/**
 * Що модуль отримує від хоста. Модуль не лізе в SQLite, stdin чи Upstash напряму:
 * лише через ці методи.
 */
export interface ModuleContext {
  /** Останній стан від Mac-аппки або null, якщо Mac мовчить. */
  mac: MacState | null;
  /** Значення налаштування цього модуля (вже з default). */
  setting<T extends SettingValue>(key: string): T;
  /** Готовий вузол switch/select для налаштування цього модуля з поточним значенням, щоб поставити його на свою сторінку. */
  settingNode(key: string): UiNode;
  /** Команда для Mac-аппки (сон, блокування, екран). */
  sendToMac(command: CommandRequest, source: 'mac' | 'telegram' | 'web'): void;
  /** Спільний стан для /status: поля, які пишуть усі модулі (`status`), у порядку модулів. */
  status(): StatusFields;
}

/** Поля модуля в спільному стані /status. null — поле є, але значення невідоме. */
export type StatusFields = Record<string, string | number | boolean | null>;

/** Кнопка під повідомленням бота: дія модуля з параметрами. */
export interface BotButton {
  label: string;
  action: string;
  params?: Record<string, string>;
}

/** Повідомлення головної команди модуля: HTML-текст і ряди кнопок. */
export interface BotMenu {
  text: string;
  buttons: BotButton[][];
}

/** Команда другого рівня: `/awake_start 2h` → дія `start` модуля. */
export interface BotCommand {
  /** Частина після префікса модуля: `start` дає `/awake_start`. */
  name: string;
  description: string;
  action: string;
  /** Відповідь одразу після дії. */
  reply: string;
  /** Аргумент після команди, напр. тривалість. Порожній аргумент — дія без параметра. */
  arg?: { param: string; pattern: RegExp; invalid: string };
}

/** Що модуль додає в Telegram-бот: свою головну команду (`/awake`) і команди другого рівня (`/awake_start`). */
export interface ModuleBot {
  /** Головна команда без слеша. Команди другого рівня — `<command>_<name>`. */
  command: string;
  description: string;
  menu(ctx: ModuleContext): BotMenu;
  commands?: BotCommand[];
}

/** Плагін MaControl. Реєструється в ModulesService і більше ніде не згадується. */
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
  /** Обробники дій з кнопок: name → handler. */
  actions: Record<
    string,
    (params: Record<string, string | number | boolean>, ctx: ModuleContext, source: 'mac' | 'telegram' | 'web') => void | Promise<void>
  >;
  /** Команди модуля в Telegram-боті. Без нього модуль у боті не з'являється. */
  bot?: ModuleBot;
  /** Поля, які модуль пише в спільний стан /status. */
  status?(ctx: ModuleContext): StatusFields | null;
  /** Налаштування змінилось (вже збережене). Напр. Awake пересилає його в Mac-аппку. */
  onSettingChanged?(key: string, value: string | number | boolean, ctx: ModuleContext): void | Promise<void>;
}

/** Список модулів: { provide: MAC_MODULES, useFactory: (...m) => m, inject: [AwakeMacModule, …] } у ModulesModule. */
export const MAC_MODULES = Symbol('MAC_MODULES');

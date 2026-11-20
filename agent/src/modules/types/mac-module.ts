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

/** Куди веде кнопка: екран свого модуля (`sleep`, `volume`; '' — головний) або іншого модуля. */
export interface BotNav {
  module?: string;
  screen: string;
}

/**
 * Кнопка під повідомленням бота: дія модуля з параметрами, перехід на інший екран, або дія з переходом
 * (тоді після дії бот малює екран `go`, інакше — той самий).
 */
export interface BotButton {
  label: string;
  action?: string;
  params?: Record<string, string>;
  go?: BotNav;
}

/** Екран меню модуля: HTML-текст, ряди кнопок і, крім головного, куди веде «← Назад». */
export interface BotMenu {
  text: string;
  buttons: BotButton[][];
  back?: BotNav;
}

/**
 * Що модуль додає в Telegram-бот. Нові можливості йдуть екранами меню (інлайн-навігація вглиб:
 * `/awake` → «Таймер сну» → «30 хв»), а не новими командами.
 */
export interface ModuleBot {
  /** Єдина команда модуля, без слеша. Без неї модуль відкривається лише кнопками (з /start або з меню іншого модуля). */
  command?: string;
  /** Назва модуля в /start і в меню команд. */
  description: string;
  /** Екран меню за шляхом: '' — головний. Невідомий шлях — головний. */
  menu(ctx: ModuleContext, screen: string): BotMenu;
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

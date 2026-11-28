import type { CommandRequest, MacPermission, MacState, SettingDefinition, SettingValue, UiChart, UiNode, UiPage } from '@awake/contracts';
import type { TelegramNotificationSource } from '../../telegram/notifications';
import type { LiveChartSpec } from './live-chart.types';
import type { ModuleSource } from './module-source';
import type { UiModuleStats } from './ui-module-stats';

/**
 * Що модуль отримує від хоста. Модуль не лізе в SQLite, stdin чи Upstash напряму:
 * лише через ці методи.
 */
export interface ModuleContext {
  /** Останній стан від Mac-аппки або null, якщо Mac мовчить. */
  mac: MacState | null;
  /** Значення налаштування цього модуля (вже з default); `ofModule` — іншого (напр. вибір шляху на Огляді Агента). */
  setting<T extends SettingValue>(key: string, ofModule?: string): T;
  /**
   * Готовий вузол switch/select з поточним значенням, щоб поставити налаштування на свою сторінку.
   * `ofModule` — налаштування іншого модуля (напр. перемикач webhooxy на сторінці Агента); зміна йде власнику.
   */
  settingNode(key: string, ofModule?: string): UiNode;
  /**
   * Вузол графіка статистики за період: точки всього вікна зараз, а на сторінці, відкритій у Mac, далі — live-тіки
   * поточного бакета (LiveChartsService). id вузла має бути унікальним на сторінці.
   */
  liveChart(spec: LiveChartSpec): UiChart;
  /**
   * Чому цей модуль зараз не може користуватись системним дозволом: не видано в системі або вимкнено модулю
   * на сторінці «Дозволи». null — дозвіл є. Модуль показує причину на своїй сторінці.
   */
  missingPermission(permission: MacPermission): string | null;
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
  /** Модуль-провайдер, під яким сторінки цього модуля стоять у меню (`UiModuleInfo.parent`). */
  parent?: string;
  /** Одне-два речення для користувача: що робить модуль. Поки що лише в маніфесті, в UI не йде. */
  description?: string;
  /** Системні дозволи Mac, які модуль просить. Mac показує їх окремо по модулях і дає лише дозволені. */
  permissions: MacPermission[];
  /** Налаштування, які хост покаже в «Налаштуваннях» і збереже як `<id>.<key>`. */
  settings: SettingDefinition[];
  /**
   * Події, які модуль хоче слати: джерело з id модуля. Хост сам реєструє його в реєстрі сповіщень на старті
   * (без `register` у конструкторі модуля); модуль далі лише кличе `notify`.
   */
  notifications?: TelegramNotificationSource;
  /** Декларація статистики для UI: сторінка, графіки, ключі namespace-ів, фільтри. Запис — у сервісах модуля. */
  stats?: UiModuleStats;
  /** Сторінки модуля (вкладені вузли): з них сервер бере індекс роутів і одну сторінку таблицею. Будуються з поточного стану щоразу. */
  pages(ctx: ModuleContext): UiPage[] | Promise<UiPage[]>;
  /** Модуль вимкнений (жорстко в агенті чи у своїй вкладці): причина для сірого пункту меню; null — працює. Сторінок тоді немає. */
  disabled?(ctx: ModuleContext): string | null;
  /** Поля модуля в /status під ключем його id. null або без значень — ключа немає. */
  status?(ctx: ModuleContext): StatusFields | null;
  /** Перевірка перед збереженням: причина відмови (напр. вибрано вимкнений шлях) або null. */
  rejectSetting?(key: string, value: SettingValue, ctx: ModuleContext): string | null;
  /** Налаштування змінилось (вже збережене). Напр. Awake пересилає його в Mac-аппку. */
  onSettingChanged?(key: string, value: string | number | boolean, ctx: ModuleContext): void | Promise<void>;
}

/** Список модулів: { provide: MAC_MODULES, useFactory: (...m) => m, inject: [AwakeMacModule, …] } у ModulesModule. */
export const MAC_MODULES = Symbol('MAC_MODULES');

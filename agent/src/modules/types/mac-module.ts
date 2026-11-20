import type { CommandRequest, MacState, SettingDefinition, SettingValue, UiPage } from '@awake/contracts';

/**
 * Що модуль отримує від хоста. Модуль не лізе в SQLite, stdin чи Upstash напряму:
 * лише через ці методи.
 */
export interface ModuleContext {
  /** Останній стан від Mac-аппки або null, якщо Mac мовчить. */
  mac: MacState | null;
  /** Значення налаштування цього модуля (вже з default). */
  setting<T extends SettingValue>(key: string): T;
  /** Команда для Mac-аппки (сон, блокування, екран). */
  sendToMac(command: CommandRequest, source: 'mac' | 'telegram' | 'web'): void;
}

/** Плагін MacCC. Реєструється в ModulesService і більше ніде не згадується. */
export interface MacModule {
  id: string;
  title: string;
  icon: { symbol: string; tone: import('@awake/contracts').UiTone };
  /** Налаштування, які хост покаже в «Налаштуваннях» і збереже як `<id>.<key>`. */
  settings: SettingDefinition[];
  /** Вкладки модуля в бічному меню. Будуються з поточного стану щоразу. */
  pages(ctx: ModuleContext): UiPage[] | Promise<UiPage[]>;
  /** Обробники дій з кнопок: name → handler. */
  actions: Record<string, (params: Record<string, string | number | boolean>, ctx: ModuleContext) => void | Promise<void>>;
  /** Налаштування змінилось (вже збережене). Напр. Awake пересилає його в Mac-аппку. */
  onSettingChanged?(key: string, value: string | number | boolean, ctx: ModuleContext): void | Promise<void>;
}

/** Список модулів: { provide: MAC_MODULES, useFactory: (...m) => m, inject: [AwakeMacModule, …] } у ModulesModule. */
export const MAC_MODULES = Symbol('MAC_MODULES');

// Декларативні налаштування модуля. Хост сам малює їх на сторінці «Налаштування» в секції модуля
// і зберігає за ключем `<module>.<key>`. Модуль лише читає значення.

export type SettingValue = string | number | boolean;

interface SettingBase {
  key: string;
  label: string;
  hint?: string;
  icon?: { symbol: string; tone: import('./ui').UiTone };
  /** local — налаштування видно лише на Mac і в локальному пульті (напр. довірені мережі), не на Vercel; mac — лише в SwiftUI, змінити можна з Mac або Telegram. */
  scope?: import('./ui').UiScope;
  /**
   * Id сторінки модуля, де модуль сам показує це налаштування (через ctx.settingNode).
   * Тоді хост не дублює його на сторінці «Налаштування».
   */
  page?: string;
}

export interface SwitchSetting extends SettingBase {
  type: 'switch';
  default: boolean;
}

export interface SelectSetting extends SettingBase {
  type: 'select';
  default: string;
  options: import('./ui').UiOption[];
}

export type SettingDefinition = SwitchSetting | SelectSetting;

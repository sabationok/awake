// Server-driven UI MaControl. Модулі в Nest будують дерево з цих вузлів, а Next (і пізніше SwiftUI)
// лише малюють його і повертають дії. Жодної логіки модулів у рендерерах.

export type UiTone = 'accent' | 'green' | 'orange' | 'red' | 'gray' | 'indigo' | 'yellow';

/** Іконка: назва SF Symbol. Next мапить її на свою іконку, невідому — на крапку. */
export interface UiIcon {
  symbol: string;
  tone: UiTone;
}

/**
 * Де показувати вузол або сторінку: all — і на Mac, і на Vercel/WebApp; local — лише на Mac і в локальному пульті;
 * mac — лише в SwiftUI Mac-аппки.
 */
export type UiScope = 'all' | 'local' | 'mac';

/** Дія модуля, яку викликає кнопка. Рендерер шле її як є і нічого не знає про її зміст. */
export interface UiAction {
  module: string;
  name: string;
  params?: Record<string, string | number | boolean>;
}

export interface UiButton {
  id: string;
  label: string;
  action: UiAction;
  variant?: 'filled' | 'plain' | 'destructive';
  disabled?: boolean;
  /** Текст підтвердження перед дією. */
  confirm?: string;
}

export interface UiOption {
  value: string;
  label: string;
  /** Опцію видно, але вибрати не можна (напр. транспорт, вимкнений у своєму модулі). */
  disabled?: boolean;
}

interface UiNodeBase {
  id: string;
  scope?: UiScope;
}

/** Група рядків з заголовком і підписом, як у «Системних параметрах». */
export interface UiSection extends UiNodeBase {
  type: 'section';
  title?: string;
  footer?: string;
  children: UiNode[];
}

/**
 * Керувальний елемент праворуч у рядку. Перемикач або вибір пишуть налаштування (`setting`),
 * а перемикач без налаштування викликає дії `on` / `off` (напр. старт і стоп сесії).
 */
export type UiControl =
  | {
      type: 'switch';
      value: boolean;
      disabled?: boolean;
      setting?: { module: string; key: string };
      on?: UiAction;
      off?: UiAction;
    }
  | {
      type: 'select';
      value: string;
      options: UiOption[];
      disabled?: boolean;
      /** Вибір пише налаштування модуля… */
      setting?: { module: string; key: string };
      /** …або викликає дію з `params.value` = вибране значення (напр. таймер сну). */
      action?: UiAction;
    }
  /** Повзунок: відпущений, викликає дію з `params.value` = число (гучність, яскравість). */
  | { type: 'slider'; value: number; min: number; max: number; step?: number; disabled?: boolean; action: UiAction }
  | { type: 'button'; button: UiButton };

/** Рядок «назва — значення» або «назва — керувальний елемент», як у SwiftUI-аппці. */
export interface UiRow extends UiNodeBase {
  type: 'row';
  label: string;
  value?: string;
  hint?: string;
  icon?: UiIcon;
  /** Головний рядок модуля: більша іконка, назва жирним, hint як опис у кілька рядків. */
  prominent?: boolean;
  /** Крапка стану перед hint. */
  dot?: { tone: UiTone; pulse?: boolean };
  /** ISO-час: рендерер дописує до hint зворотний відлік H:MM:SS і оновлює його щосекунди. */
  countdownTo?: string | null;
  /** Елемент праворуч замість value. */
  control?: UiControl;
}

/** Головний рядок стану: крапка, підпис, великий текст або зворотний відлік. */
export interface UiStatus extends UiNodeBase {
  type: 'status';
  label: string;
  hint?: string;
  icon?: UiIcon;
  tone: UiTone;
  pulse?: boolean;
  value?: string;
  /** ISO-час: рендерер сам рахує зворотний відлік до нього щосекунди. */
  countdownTo?: string | null;
}

/** Перемикач налаштування модуля. Зміна йде як UiSettingChange з цим key. */
export interface UiSwitch extends UiNodeBase {
  type: 'switch';
  label: string;
  hint?: string;
  icon?: UiIcon;
  module: string;
  key: string;
  value: boolean;
  disabled?: boolean;
}

/** Випадний список налаштування модуля. */
export interface UiSelect extends UiNodeBase {
  type: 'select';
  label: string;
  hint?: string;
  icon?: UiIcon;
  module: string;
  key: string;
  value: string;
  options: UiOption[];
  disabled?: boolean;
}

/** Ряд кнопок однакової ширини. */
export interface UiButtons extends UiNodeBase {
  type: 'buttons';
  buttons: UiButton[];
}

/** Список записів (історія, журнал). */
export interface UiList extends UiNodeBase {
  type: 'list';
  items: { id: string; label: string; hint?: string; value?: string }[];
  empty?: string;
}

export interface UiText extends UiNodeBase {
  type: 'text';
  text: string;
  tone?: UiTone;
}

/**
 * Вкладки всередині секції: перемикач зверху і вміст вибраної вкладки під ним.
 * Вибір вкладки — стан рендерера, агентові він не потрібен.
 */
export interface UiTabs extends UiNodeBase {
  type: 'tabs';
  tabs: { id: string; label: string; children: UiNode[] }[];
  /** Вкладка, з якої почати. */
  value?: string;
  /** Вибір вкладки пише це налаштування (id вкладки), коли від нього залежить дія модуля. */
  setting?: { module: string; key: string };
}

/** Великий таймер на всю ширину: зворотний відлік до `until` або `value`, коли відліку немає. */
export interface UiTimer extends UiNodeBase {
  type: 'timer';
  /** ISO-час: рендерер рахує H:MM:SS щосекунди. */
  until?: string | null;
  /** ISO-час початку: з ним колір відліку йде від зеленого до червоного за часткою часу, що лишилась. */
  from?: string | null;
  /** Текст замість відліку (запланована тривалість, «—»). */
  value: string;
  /** Підпис під таймером. */
  caption?: string;
  tone?: UiTone;
}

export type UiNode = UiSection | UiRow | UiStatus | UiSwitch | UiSelect | UiButtons | UiList | UiText | UiTabs | UiTimer;

/** Вкладка бічного меню. */
export interface UiPage {
  id: string;
  module: string;
  title: string;
  icon: UiIcon;
  /** Група в бічному меню: модулі разом, системні сторінки окремо. */
  group: 'modules' | 'system';
  scope?: UiScope;
  children: UiNode[];
}

/**
 * Як дашборд дістається до агента напряму. Без цього блоку дашборд лише показує дерево,
 * а всі керувальні елементи вимкнені.
 */
export interface UiLocalAccess {
  /** HTTPS-адреса API агента в локальній мережі, напр. https://192.168.1.5:47800. */
  url: string;
  /** Одноразовий код сполучення: дашборд міняє його на токен пристрою. */
  code: string;
  /** PEM локального центру сертифікації, якому пристрій має довіритись один раз. */
  ca: string;
}

/** Модуль у бічному меню: його сторінки йдуть під цим заголовком у порядку списку. */
export interface UiModuleInfo {
  id: string;
  title: string;
  icon: UiIcon;
  /** Системні дозволи Mac, які модуль просить. Mac дає їх лише тоді, коли дозвіл видано системі і користувач лишив його модулю. */
  permissions: MacPermission[];
  /** Модуль вимкнений: пункт меню видно сірим, він не розгортається і не відкривається. Текст — чому. */
  disabled?: string;
}

/**
 * Системний дозвіл Mac-аппки (зараз усі живуть у правилі sudoers). Систему дозволяє користувач на Mac,
 * модуль лише декларує, що з них йому треба.
 */
export type MacPermission = 'sleepControl' | 'thermalRead';

/** Усе дерево застосунку. */
export interface UiTree {
  /** Порядок і назви модулів для бічного меню; сторінки групи system ідуть після них. */
  modules: UiModuleInfo[];
  app: {
    title: string;
    host: string;
    online: boolean;
    updatedAt: string;
    /** Прямий доступ до агента; є лише в довіреній Wi-Fi і лише в дереві для Vercel. */
    local?: UiLocalAccess | null;
  };
  pages: UiPage[];
}

/** Зміна налаштування з рендерера. */
export interface UiSettingChange {
  module: string;
  key: string;
  value: string | number | boolean;
}

/** Те, що рендерер шле на сервер. */
export type UiEvent = { type: 'action'; action: UiAction } | { type: 'setting'; change: UiSettingChange };

// Server-driven UI MaControl. Модулі в Nest будують дерево з цих вузлів, а Next (і пізніше SwiftUI)
// лише малюють його і повертають дії. Жодної логіки модулів у рендерерах.

export type UiTone = 'accent' | 'green' | 'orange' | 'red' | 'gray' | 'indigo' | 'yellow';

/** Іконка: назва SF Symbol. Next мапить її на свою іконку, невідому — на крапку. */
export interface UiIcon {
  symbol: string;
  tone: UiTone;
}

/**
 * Де показувати вузол або сторінку: all — і на Mac, і на Vercel/WebApp; local — лише на Mac і в локальному Web UI;
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
  /**
   * Стан вузла з AppState (contracts/src/state.ts). Є — клієнт бере стан звідси, а не зі значень вузла; немає —
   * рендерить значення з вузла, як раніше. Обидва шляхи живуть разом до кінця переходу.
   */
  bind?: import('./state').UiBind | import('./state').UiValueBind;
}

/** Група рядків з заголовком і підписом, як у «Системних параметрах». */
export interface UiSection extends UiNodeBase {
  type: 'section';
  title?: string;
  footer?: string;
  /** Стан блоку праворуч від заголовка («● Підключено»). */
  status?: UiStatusBadge;
  /** Дії блоку в шапці («Створити»): 1 — кнопка, 2+ — меню «⋯». */
  actions?: UiMenuItem[];
  /**
   * Що це за секція за змістом, не як її малювати: `summary` — підсумок статистики, рядки «назва — число».
   * Вигляд вирішує клієнт своїми компонентами (Web UI — сітка плиток); клієнт, що не знає `kind`, малює рядки.
   */
  kind?: 'summary';
  children: UiNode[];
}

/** Порівняння значення рядка з минулим періодом (того ж розміру). */
export interface UiCompare {
  /** Значення минулого періоду, вже відформатоване, як `value`. */
  previous: string;
  /** Зміна у відсотках від минулого (`+12`, `-40`); null, коли минуле 0. */
  deltaPct: number | null;
  /** Який напрям добрий: `up` — більше краще, `down` — менше (помилки). Без нього зміна нейтральна. */
  goodWhen?: 'up' | 'down';
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
  /** Порівняння з минулим періодом; опційне. */
  compare?: UiCompare;
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
  /** Плашка вкладок прилипає до верху скрол-області. */
  sticky?: boolean;
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

/** Стовпчик (або сегмент stacked-стовпчика) графіка: початок бакета і значення. */
export interface UiChartPoint {
  /** ISO-час початку бакета. */
  start: string;
  value: number;
  /** Серія stacked-графіка; точки з тим самим start складаються в один стовпчик. */
  series?: string;
}

/** Стовпчиковий графік по часу: Mac-аппка — як «Акумулятор» у Системних параметрах, веб — простіші стовпчики. */
export interface UiChart extends UiNodeBase {
  type: 'chart';
  title: string;
  /** Розмір бакета: від нього підписи осі X. */
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month';
  points: UiChartPoint[];
  /** Колір однієї серії. */
  tone?: UiTone;
  /** Колір кожної серії stacked-графіка. */
  tones?: Record<string, UiTone>;
  /** Як підписати шкалу: кількість, тривалість (секунди), байти, відсотки чи дробове число. */
  format?: 'count' | 'duration' | 'bytes' | 'percent' | 'number';
  /** Пунктирна лінія ліміту. */
  limit?: number;
}

/**
 * Колір дії: default — сіра, accent — синя, warn — помаранчева, danger — червона.
 * Нове замість `UiButton.variant`; старі кнопки лишаються, поки сервер і Swift не перейдуть.
 */
export type UiActionVariant = 'default' | 'accent' | 'warn' | 'danger';

/** Підтвердження перед дією: діалог з заголовком, текстом і кнопкою OK (ліворуч завжди «Скасувати»). */
export interface UiConfirm {
  title: string;
  text: string;
  ok: string;
}

/** Поле форми дії. Значення йде в `action.params[name]`. */
export interface UiFormField {
  name: string;
  label: string;
  kind: 'text' | 'password' | 'url' | 'select';
  value?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  /** Ім'я іншого поля, з яким значення має збігтися («Повторіть пароль»). Клієнт показує незбіг одразу, сервер перевіряє ще раз. */
  sameAs?: string;
  /** Лише для `select`. */
  options?: UiOption[];
}

/**
 * Форма дії: одне поле — інлайн (рядок стає полем з «Скасувати» / OK), два і більше — модалка.
 * Вибір між ними робить рендерер за кількістю полів, сервер його не задає.
 */
export interface UiForm {
  title?: string;
  fields: UiFormField[];
  /** Підпис кнопки OK; без нього «Зберегти». */
  submit?: string;
}

/**
 * Пункт дії. Сервер віддає вже розв'язаний список за станом (видано → лише «Відкликати», ні → лише «Запит»);
 * клієнт нічого не перевіряє. 1 пункт — кнопка, 2+ — меню «⋯», 0 — нічого.
 */
export interface UiMenuItem {
  id: string;
  label: string;
  icon?: UiIcon;
  variant: UiActionVariant;
  action: UiAction;
  confirm?: UiConfirm;
  /** Дія з формою: клієнт збирає поля і шле `action` з їхніми значеннями в params. */
  form?: UiForm;
  /** mac — у web пункт видно, але він вимкнений з `hint`. */
  scope?: UiScope;
  hint?: string;
  disabled?: boolean;
}

/** Мітка-чип без дії (напр. «Tailscale»). */
export interface UiTag {
  label: string;
  tone?: UiTone;
}

/** Стан словом з крапкою: «● Активна», «● Підключено». */
export interface UiStatusBadge {
  label: string;
  tone: UiTone;
  pulse?: boolean;
}

/**
 * Картка елемента (пристрій, група, дозвіл, мережа, сесія). Зверху вниз: заголовок (назва; праворуч статус,
 * керування, дії), теги, значення для копіювання, коментар. Під заголовком і в коментарі кнопок немає.
 */
export interface UiItem extends UiNodeBase {
  type: 'item';
  title: string;
  icon?: UiIcon;
  status?: UiStatusBadge;
  tags?: UiTag[];
  /** Значення лише для читання (адреса, ID) під заголовком з кнопкою «Копіювати». */
  copy?: { value: string; label?: string };
  comment?: string;
  /** Керування праворуч у заголовку (напр. перемикач «публікувати» топіка). */
  control?: UiControl;
  actions?: UiMenuItem[];
}

/**
 * Сповіщення в сторінці: info / warn / error. Чи показувати, коли нагадати і чи закрито — рахує сервер
 * (timestamp-и), клієнт лише малює і шле `dismiss`.
 */
export interface UiNotice extends UiNodeBase {
  type: 'notice';
  variant: 'info' | 'warn' | 'error';
  icon?: UiIcon;
  title?: string;
  text: string;
  /** Прилипає до краю скрол-області; без поля — у потоці. */
  sticky?: 'top' | 'bottom';
  /** Є — показується хрестик, клік шле цю дію. */
  dismiss?: UiAction;
}

/** Роздільна лінія; з `word` — лінія, слово, лінія («або»). */
export interface UiSeparator extends UiNodeBase {
  type: 'separator';
  word?: string;
}

/**
 * QR-код з рядка (посилання сполучення). Шлеться лише зі scope mac: код у ньому одноразовий і з Mac не виходить.
 * `expiresAt` — коли код перестане діяти: рендерер затемнює QR, сервер тоді ж шле новий вузол.
 */
export interface UiQr extends UiNodeBase {
  type: 'qr';
  value: string;
  expiresAt?: string | null;
}

export type UiNode =
  | UiSection
  | UiRow
  | UiStatus
  | UiSwitch
  | UiSelect
  | UiButtons
  | UiList
  | UiText
  | UiTabs
  | UiTimer
  | UiChart
  | UiItem
  | UiNotice
  | UiSeparator
  | UiQr;

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
 * Як Web UI дістається до агента напряму. Без цього блоку Web UI лише показує дерево,
 * а всі керувальні елементи вимкнені.
 */
export interface UiLocalAccess {
  /** HTTPS-адреса API агента в локальній мережі, напр. https://192.168.1.5:47800. */
  url: string;
  /** Одноразовий код сполучення: Web UI міняє його на токен пристрою. */
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
  /**
   * Модуль-провайдер, під яким сторінки цього модуля стоять у меню (Групи → Telegram). Логіка модуля від нього не
   * залежить; без поля — модуль верхнього рівня.
   */
  parent?: string;
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

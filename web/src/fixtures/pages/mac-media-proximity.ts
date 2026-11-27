import type { UiNode, UiPage } from '@awake/contracts';
import { inMinutes } from '../time';

// Стан для фікстур: Mac онлайн, MacBook Pro від батареї 78%, звук 45% без вимкнення, яскравість 70%,
// Wi-Fi «HomeNet» (довірена), два пристрої Bluetooth поруч. Дзеркалить builder-и агента; значення, що
// залежать від часу, йдуть через inMinutes().

/** Час HH:MM, як formatClock в агенті (локальна зона браузера). */
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

const IPHONE_ID = '7A1F0C2E-3B4D-4E5F-8A9B-0C1D2E3F4A5B';
const WATCH_ID = '5C4B3A2F-1E0D-4C9B-8A7F-6E5D4C3B2A1F';

/** Сторінка «Екран і звук» (mac-media, buildMediaPage). */
function mediaPage(): UiPage {
  const children: UiNode[] = [
    {
      id: 'sound',
      type: 'section',
      title: 'Звук',
      children: [
        {
          id: 'volume',
          type: 'row',
          label: 'Гучність',
          value: '45%',
          icon: { symbol: 'speaker.wave.2.fill', tone: 'indigo' },
          control: {
            type: 'slider',
            value: 45,
            min: 0,
            max: 100,
            step: 5,
            disabled: false,
            action: { module: 'media', name: 'volume' },
          },
        },
        {
          id: 'mute',
          type: 'row',
          label: 'Без звуку',
          icon: { symbol: 'speaker.slash.fill', tone: 'gray' },
          control: {
            type: 'switch',
            value: false,
            disabled: false,
            on: { module: 'media', name: 'mute', params: { value: true } },
            off: { module: 'media', name: 'mute', params: { value: false } },
          },
        },
      ],
    },
    {
      id: 'display',
      type: 'section',
      title: 'Екран',
      footer: 'Лише вбудований дисплей. Коли кришку закрито, яскравість не змінити.',
      children: [
        {
          id: 'brightness',
          type: 'row',
          label: 'Яскравість',
          value: '70%',
          icon: { symbol: 'sun.max.fill', tone: 'yellow' },
          control: {
            type: 'slider',
            value: 70,
            min: 0,
            max: 100,
            step: 5,
            disabled: false,
            action: { module: 'media', name: 'brightness' },
          },
        },
      ],
    },
  ];
  return {
    id: 'media',
    module: 'media',
    title: 'Екран і звук',
    icon: { symbol: 'speaker.wave.2.fill', tone: 'indigo' },
    group: 'modules',
    children,
  };
}

/** Сторінка «Поруч» (proximity, buildProximityPage): увімкнено, вибрано iPhone, слабкий сигнал не зафіксовано. */
function proximityPage(): UiPage {
  const lastLockAt = inMinutes(-340);
  return {
    id: 'proximity',
    module: 'proximity',
    title: 'Поруч',
    icon: { symbol: 'iphone.radiowaves.left.and.right', tone: 'indigo' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'status',
        type: 'section',
        children: [
          { id: 'bluetooth', type: 'item', title: 'Bluetooth', status: { label: 'Увімкнено', tone: 'green' } },
          {
            id: 'device',
            type: 'row',
            label: 'iPhone',
            value: '-62 dBm · поруч',
            icon: { symbol: 'iphone', tone: 'green' },
          },
          {
            id: 'watching',
            type: 'row',
            label: 'Стеження',
            value: 'активне',
            icon: { symbol: 'eye', tone: 'accent' },
          },
          {
            id: 'last-lock',
            type: 'row',
            label: 'Останнє блокування',
            value: clock(lastLockAt),
            icon: { symbol: 'lock.fill', tone: 'indigo' },
          },
        ],
      },
      {
        id: 'settings',
        type: 'section',
        title: 'Блокування',
        children: [
          {
            id: 'proximity.enabled',
            type: 'switch',
            module: 'proximity',
            key: 'enabled',
            label: 'Блокувати, коли я далеко',
            hint: 'Mac слухає Bluetooth вашого iPhone чи Apple Watch і блокує екран, коли сигнал слабне.',
            icon: { symbol: 'lock.fill', tone: 'indigo' },
            scope: 'local',
            value: true,
          },
          {
            id: 'proximity.device',
            type: 'select',
            module: 'proximity',
            key: 'device',
            label: 'Пристрій',
            icon: { symbol: 'iphone', tone: 'accent' },
            scope: 'local',
            value: IPHONE_ID,
            options: [
              { value: '', label: 'Не вибрано' },
              { value: IPHONE_ID, label: 'iPhone · -62 dBm' },
              { value: WATCH_ID, label: 'Apple Watch · -71 dBm' },
            ],
          },
          {
            id: 'proximity.range',
            type: 'select',
            module: 'proximity',
            key: 'range',
            label: 'Діапазон',
            icon: { symbol: 'dot.radiowaves.left.and.right', tone: 'accent' },
            scope: 'local',
            value: '-75',
            options: [
              { value: '-60', label: 'До 1 м' },
              { value: '-70', label: '≈ 2–3 м' },
              { value: '-75', label: '≈ 3–5 м' },
              { value: '-80', label: '≈ 5–8 м' },
              { value: '-85', label: '≈ 10 м' },
            ],
          },
          {
            id: 'proximity.delay',
            type: 'select',
            module: 'proximity',
            key: 'delay',
            label: 'Затримка',
            icon: { symbol: 'timer', tone: 'gray' },
            scope: 'local',
            value: '10',
            options: [
              { value: '5', label: '5 с' },
              { value: '10', label: '10 с' },
              { value: '20', label: '20 с' },
              { value: '30', label: '30 с' },
              { value: '60', label: '1 хв' },
            ],
          },
          {
            id: 'proximity.when',
            type: 'select',
            module: 'proximity',
            key: 'when',
            label: 'Коли стежити',
            icon: { symbol: 'clock', tone: 'gray' },
            scope: 'local',
            value: 'always',
            options: [
              { value: 'session', label: 'Лише під час сесії' },
              { value: 'always', label: 'Завжди' },
            ],
          },
        ],
      },
      {
        id: 'proximity-bluetooth-notice',
        type: 'notice',
        variant: 'warn',
        text: 'Спарте iPhone чи Apple Watch з Mac у Системних параметрах → Bluetooth, інакше iOS міняє адресу і Mac його губить. Розблоковує лише пароль або Apple Watch.',
      },
    ],
  };
}

/** Сторінка «Стан Mac» (mac module, buildStatusPage с trusted=true): від батареї 78%, кришка відкрита. */
function statusPage(): UiPage {
  return {
    id: 'status',
    module: 'system',
    title: 'Стан Mac',
    icon: { symbol: 'waveform.path.ecg', tone: 'green' },
    group: 'system',
    children: [
      {
        id: 'rows',
        type: 'section',
        children: [
          { id: 'sleep', type: 'row', label: 'Сон', value: 'Працює звично', icon: { symbol: 'moon.fill', tone: 'indigo' } },
          { id: 'battery', type: 'row', label: 'Батарея', value: '78%', icon: { symbol: 'battery.75', tone: 'green' } },
          { id: 'power', type: 'row', label: 'Живлення', value: 'Від батареї', icon: { symbol: 'powerplug.fill', tone: 'accent' } },
          { id: 'thermal', type: 'row', label: 'Температура', value: 'Норма', icon: { symbol: 'thermometer.medium', tone: 'green' } },
          { id: 'lid', type: 'row', label: 'Кришка', value: 'Відкрита', icon: { symbol: 'laptopcomputer', tone: 'gray' } },
          {
            id: 'network',
            type: 'row',
            scope: 'local',
            label: 'Мережа',
            value: 'HomeNet · довірена',
            icon: { symbol: 'wifi', tone: 'accent' },
          },
        ],
      },
      {
        id: 'warnings',
        type: 'section',
        title: 'Попередження',
        children: [
          {
            id: 'system.batteryWarn',
            type: 'select',
            module: 'system',
            key: 'batteryWarn',
            label: 'Попередження про заряд',
            icon: { symbol: 'battery.25', tone: 'yellow' },
            value: '25',
            options: [
              { value: '15', label: '15%' },
              { value: '20', label: '20%' },
              { value: '25', label: '25%' },
              { value: '30', label: '30%' },
            ],
          },
        ],
      },
    ],
  };
}

/** Сторінка «Дозволи» (mac-permissions, buildPermissionsPage): обидва дозволи видано, модулям лишено все. */
function permissionsPage(): UiPage {
  return {
    id: 'permissions',
    module: 'permissions',
    title: 'Дозволи',
    icon: { symbol: 'lock.fill', tone: 'accent' },
    group: 'system',
    scope: 'local',
    children: [
      {
        id: 'permissions-system',
        type: 'section',
        title: 'Система',
        footer:
          'Окремі правила sudoers із фіксованими командами без пароля. Видати чи відкликати можна лише за самим Mac: macOS попросить пароль. Модулі не можуть отримати більше, ніж видано тут.',
        children: [
          {
            id: 'permissions-system-sleepControl',
            type: 'item',
            title: 'Керування сном',
            icon: { symbol: 'moon.zzz.fill', tone: 'accent' },
            status: { label: 'Видано', tone: 'green' },
            comment: 'Блокує сон на час сесії і повертає його після таймера, заряду чи перегріву.',
            actions: [
              {
                id: 'permissions-revoke-sleepControl',
                label: 'Відкликати',
                variant: 'danger',
                action: { module: 'permissions', name: 'revoke', params: { permission: 'sleepControl' } },
                scope: 'mac',
                hint: 'Змінити можна лише в аппці на Mac',
                disabled: false,
                confirm: {
                  title: 'Відкликати «Керування сном»?',
                  text: 'Модулі, яким він потрібен, перестануть це робити. macOS попросить пароль.',
                  ok: 'Відкликати',
                },
              },
            ],
          },
          {
            id: 'permissions-system-thermalRead',
            type: 'item',
            title: 'Читання температури',
            icon: { symbol: 'thermometer.medium', tone: 'accent' },
            status: { label: 'Видано', tone: 'green' },
            comment: 'Дає статус тиску системи і сигнали про нагрівання.',
            actions: [
              {
                id: 'permissions-revoke-thermalRead',
                label: 'Відкликати',
                variant: 'danger',
                action: { module: 'permissions', name: 'revoke', params: { permission: 'thermalRead' } },
                scope: 'mac',
                hint: 'Змінити можна лише в аппці на Mac',
                disabled: false,
                confirm: {
                  title: 'Відкликати «Читання температури»?',
                  text: 'Модулі, яким він потрібен, перестануть це робити. macOS попросить пароль.',
                  ok: 'Відкликати',
                },
              },
            ],
          },
        ],
      },
      {
        id: 'permissions-module-awake',
        type: 'section',
        title: 'Awake',
        children: [
          {
            id: 'permissions-module-awake-sleepControl',
            type: 'row',
            label: 'Керування сном',
            hint: 'Блокує сон на час сесії і повертає його після таймера, заряду чи перегріву.',
            icon: { symbol: 'moon.zzz.fill', tone: 'accent' },
            control: {
              type: 'switch',
              value: true,
              on: { module: 'permissions', name: 'setModule', params: { module: 'awake', permission: 'sleepControl', allowed: true } },
              off: { module: 'permissions', name: 'setModule', params: { module: 'awake', permission: 'sleepControl', allowed: false } },
            },
          },
          {
            id: 'permissions-module-awake-thermalRead',
            type: 'row',
            label: 'Читання температури',
            hint: 'Дає статус тиску системи і сигнали про нагрівання.',
            icon: { symbol: 'thermometer.medium', tone: 'accent' },
            control: {
              type: 'switch',
              value: true,
              on: { module: 'permissions', name: 'setModule', params: { module: 'awake', permission: 'thermalRead', allowed: true } },
              off: { module: 'permissions', name: 'setModule', params: { module: 'awake', permission: 'thermalRead', allowed: false } },
            },
          },
        ],
      },
      {
        id: 'permissions-module-system',
        type: 'section',
        title: 'Стан Mac',
        children: [
          {
            id: 'permissions-module-system-thermalRead',
            type: 'row',
            label: 'Читання температури',
            hint: 'Дає статус тиску системи і сигнали про нагрівання.',
            icon: { symbol: 'thermometer.medium', tone: 'accent' },
            control: {
              type: 'switch',
              value: true,
              on: { module: 'permissions', name: 'setModule', params: { module: 'system', permission: 'thermalRead', allowed: true } },
              off: { module: 'permissions', name: 'setModule', params: { module: 'system', permission: 'thermalRead', allowed: false } },
            },
          },
        ],
      },
    ],
  };
}

/** Сторінки Mac, Екран і звук, Поруч і Дозволи в порядку меню: модулі, далі системні. */
export function macMediaProximityPages(): UiPage[] {
  return [mediaPage(), proximityPage(), statusPage(), permissionsPage()];
}

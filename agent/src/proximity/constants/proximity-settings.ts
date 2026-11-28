import type { SettingDefinition, UiOption } from '@macontrol/contracts';

export const PROXIMITY_MODULE = 'proximity';
export const PROXIMITY_PAGE = 'proximity';

/** Поріг сигналу, dBm: слабший за нього — «далеко». Відстані приблизні, стіни й кишеня забирають 5–10 dBm. */
export const PROXIMITY_RANGE_OPTIONS: UiOption[] = [
  { value: '-60', label: 'До 1 м' },
  { value: '-70', label: '≈ 2–3 м' },
  { value: '-75', label: '≈ 3–5 м' },
  { value: '-80', label: '≈ 5–8 м' },
  { value: '-85', label: '≈ 10 м' },
];

/** Скільки секунд сигнал має бути слабким (або пристрою не видно), перш ніж заблокувати. */
export const PROXIMITY_DELAY_OPTIONS: UiOption[] = [
  { value: '5', label: '5 с' },
  { value: '10', label: '10 с' },
  { value: '20', label: '20 с' },
  { value: '30', label: '30 с' },
  { value: '60', label: '1 хв' },
];

export const PROXIMITY_WHEN_OPTIONS: UiOption[] = [
  { value: 'session', label: 'Лише під час сесії' },
  { value: 'always', label: 'Завжди' },
];

export const NO_DEVICE = '';

/** Пристрій вибирають зі списку того, що Mac бачить зараз, тому варіанти будуються з поточного звіту. */
export function buildProximitySettings(deviceOptions: UiOption[]): SettingDefinition[] {
  return [
    {
      type: 'switch',
      key: 'enabled',
      label: 'Блокувати, коли я далеко',
      hint: 'Mac слухає Bluetooth вашого iPhone чи Apple Watch і блокує екран, коли сигнал слабне.',
      icon: { symbol: 'lock.fill', tone: 'indigo' },
      scope: 'local',
      page: PROXIMITY_PAGE,
      default: false,
    },
    {
      type: 'select',
      key: 'device',
      label: 'Пристрій',
      icon: { symbol: 'iphone', tone: 'accent' },
      scope: 'local',
      page: PROXIMITY_PAGE,
      default: NO_DEVICE,
      options: [{ value: NO_DEVICE, label: 'Не вибрано' }, ...deviceOptions],
    },
    {
      type: 'select',
      key: 'range',
      label: 'Діапазон',
      icon: { symbol: 'dot.radiowaves.left.and.right', tone: 'accent' },
      scope: 'local',
      page: PROXIMITY_PAGE,
      default: '-75',
      options: PROXIMITY_RANGE_OPTIONS,
    },
    {
      type: 'select',
      key: 'delay',
      label: 'Затримка',
      icon: { symbol: 'timer', tone: 'gray' },
      scope: 'local',
      page: PROXIMITY_PAGE,
      default: '10',
      options: PROXIMITY_DELAY_OPTIONS,
    },
    {
      type: 'select',
      key: 'when',
      label: 'Коли стежити',
      icon: { symbol: 'clock', tone: 'gray' },
      scope: 'local',
      page: PROXIMITY_PAGE,
      default: 'session',
      options: PROXIMITY_WHEN_OPTIONS,
    },
  ];
}

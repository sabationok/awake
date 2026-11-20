import type { SettingDefinition, UiOption } from '@awake/contracts';

export const DURATION_OPTIONS: UiOption[] = [
  { value: '30m', label: '30 хв' },
  { value: '1h', label: '1 год' },
  { value: '2h', label: '2 год' },
  { value: '4h', label: '4 год' },
  { value: '8h', label: '8 год' },
];

export const AWAKE_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'duration',
    label: 'Тривалість за замовчуванням',
    default: '2h',
    page: 'session',
    options: DURATION_OPTIONS,
  },
  {
    type: 'select',
    key: 'displayOff',
    label: 'Гасити екран під час сесії',
    icon: { symbol: 'display', tone: 'accent' },
    page: 'session-settings',
    default: '-1',
    options: [
      { value: '-1', label: 'Як у системі' },
      { value: '5', label: 'Одразу' },
      { value: '30', label: 'Через 30 с' },
      { value: '60', label: 'Через 1 хв' },
      { value: '120', label: 'Через 2 хв' },
    ],
  },
  {
    type: 'switch',
    key: 'lockOnLidClose',
    label: 'Блокувати екран при закритті кришки',
    hint: 'Під час сесії Mac не засинає, тому сам не вимагатиме пароль',
    icon: { symbol: 'lock.laptopcomputer', tone: 'accent' },
    page: 'session-settings',
    default: true,
  },
  {
    type: 'select',
    key: 'batteryStop',
    label: 'Повернути сон при заряді',
    icon: { symbol: 'battery.0', tone: 'red' },
    page: 'session-settings',
    default: '10',
    options: [
      { value: '5', label: '5%' },
      { value: '10', label: '10%' },
      { value: '15', label: '15%' },
      { value: '20', label: '20%' },
    ],
  },

];

import type { SettingDefinition } from '@awake/contracts';

export const AWAKE_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'duration',
    label: 'Тривалість за замовчуванням',
    default: '2h',
    options: [
      { value: '30m', label: '30 хв' },
      { value: '1h', label: '1 год' },
      { value: '2h', label: '2 год' },
      { value: '4h', label: '4 год' },
      { value: '8h', label: '8 год' },
    ],
  },
  {
    type: 'switch',
    key: 'lockOnLidClose',
    label: 'Блокувати екран при закритті кришки',
    hint: 'Під час сесії Mac не засинає, тому сам не вимагатиме пароль',
    icon: { symbol: 'lock.laptopcomputer', tone: 'accent' },
    default: true,
  },
];

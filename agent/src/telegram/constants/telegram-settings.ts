import type { SettingDefinition } from '@awake/contracts';

export const TELEGRAM_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'bot',
    label: 'Бот у MacCC',
    hint: 'Команди й кнопки в Telegram',
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.start',
    label: 'Початок сесії',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.stop',
    label: 'Кінець сесії',
    icon: { symbol: 'moon.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.power',
    label: 'Живлення увімкнено або вимкнено',
    icon: { symbol: 'powerplug.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.batteryLow',
    label: 'Низький заряд',
    icon: { symbol: 'battery.25', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.thermal',
    label: 'Нагрівання',
    icon: { symbol: 'thermometer.medium', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
];

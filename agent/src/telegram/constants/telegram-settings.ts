import type { SettingDefinition } from '@awake/contracts';

/** Події в Telegram: ключ `events.<domain>.<type>`, domain — модуль, якому подія належить. */
export const TELEGRAM_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'bot',
    label: 'Бот у MaControl',
    hint: 'Команди й кнопки в Telegram',
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.awake.start',
    label: 'Початок сесії',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.awake.stop',
    label: 'Кінець сесії',
    icon: { symbol: 'moon.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.sleep.start',
    label: 'Таймер поставлено',
    icon: { symbol: 'moon.zzz.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.sleep.stop',
    label: 'Mac заснув або таймер скасовано',
    icon: { symbol: 'moon.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.system.power',
    label: 'Живлення увімкнено або вимкнено',
    icon: { symbol: 'powerplug.fill', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.system.batteryLow',
    label: 'Низький заряд',
    icon: { symbol: 'battery.25', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
  {
    type: 'switch',
    key: 'events.system.thermal',
    label: 'Нагрівання',
    icon: { symbol: 'thermometer.medium', tone: 'accent' },
    page: 'telegram',
    default: true,
  },
];

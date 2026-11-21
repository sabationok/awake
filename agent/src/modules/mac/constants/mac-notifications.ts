import type { TelegramNotificationSource } from '../../../telegram/notifications';

/** Події «Стану Mac» в Telegram. Шле їх скрипт Mac-аппки, тому перемикачі пересилаються в її telegram.env. */
export const MAC_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'system',
  label: 'Стан Mac',
  viaMac: true,
  events: [
    { type: 'power', label: 'Живлення увімкнено або вимкнено', icon: { symbol: 'powerplug.fill', tone: 'accent' } },
    { type: 'batteryLow', label: 'Низький заряд', icon: { symbol: 'battery.25', tone: 'accent' } },
    { type: 'thermal', label: 'Нагрівання', icon: { symbol: 'thermometer.medium', tone: 'accent' } },
  ],
};

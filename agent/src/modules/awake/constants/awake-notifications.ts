import type { TelegramNotificationSource } from '../../../telegram/notifications';

/** Події сесії Awake в Telegram. Шле їх скрипт Mac-аппки, тому перемикачі пересилаються в її telegram.env. */
export const AWAKE_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'awake',
  label: 'Awake',
  viaMac: true,
  events: [
    { type: 'start', label: 'Початок сесії', icon: { symbol: 'cup.and.saucer.fill', tone: 'accent' } },
    { type: 'stop', label: 'Кінець сесії', icon: { symbol: 'moon.fill', tone: 'accent' } },
  ],
};

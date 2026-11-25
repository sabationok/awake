import type { TelegramNotificationSource } from '../../../telegram/notifications';

/** Події таймера сну в Telegram. Шле їх агент: таймер живе в аппці, без процесу скрипта. */
export const SLEEP_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'sleep',
  label: 'Sleeper',
  events: [
    { type: 'start', label: 'Таймер поставлено', icon: { symbol: 'moon.zzz.fill', tone: 'accent' } },
    { type: 'stop', label: 'Mac заснув або таймер скасовано', icon: { symbol: 'moon.fill', tone: 'accent' } },
  ],
};

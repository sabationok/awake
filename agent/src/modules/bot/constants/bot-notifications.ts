import type { TelegramNotificationSource } from '../../../telegram/notifications';

/** Події Агента в Telegram: сам агент піднявся, підключився новий пристрій. */
export const BOT_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'bot',
  label: 'Агент',
  events: [
    { type: 'started', label: 'Агент запущено', icon: { symbol: 'power', tone: 'accent' } },
    { type: 'device', label: 'Новий пристрій підключено', icon: { symbol: 'iphone.and.arrow.forward', tone: 'accent' } },
  ],
};

import type { TelegramNotificationSource } from '../../telegram/notifications';

/** Події Tailscale в Telegram: вкладка «Tailscale» у Telegram → Сповіщення. */
export const TAILSCALE_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'tailscale',
  label: 'Tailscale',
  events: [
    { type: 'status', label: 'Дашборд через Tailscale працює або ні', icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' } },
    { type: 'pairing', label: 'Запит на сполучення через Tailscale', icon: { symbol: 'qrcode', tone: 'accent' } },
    { type: 'paired', label: 'Пристрій сполучено або відхилено', icon: { symbol: 'checkmark.shield.fill', tone: 'accent' } },
    { type: 'connected', label: 'Пристрій увійшов через Tailscale', icon: { symbol: 'iphone', tone: 'accent' } },
  ],
};

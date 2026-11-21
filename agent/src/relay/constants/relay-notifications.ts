import type { TelegramNotificationSource } from '../../telegram/notifications';

/** Події Webhooxy в Telegram. `relay` — старий id, щоб збережений перемикач `events.relay.status` лишився. */
export const RELAY_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'relay',
  label: 'Webhooxy',
  events: [
    { type: 'status', label: 'Relay активний або ні', icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' } },
    { type: 'denied', label: 'Viewer-а не пущено', icon: { symbol: 'hand.raised.fill', tone: 'accent' }, default: false },
    { type: 'limits', label: 'webhooxy не прийняв ліміти', icon: { symbol: 'slider.horizontal.3', tone: 'accent' } },
  ],
};

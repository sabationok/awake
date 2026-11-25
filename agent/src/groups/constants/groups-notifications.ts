import type { TelegramNotificationSource } from '../../telegram/notifications';
import { GROUPS_MODULE } from './groups-module';

/** Типи подій модуля «Групи»: кожен `notify` модуля бере тип звідси. */
export const GROUPS_NOTIFICATION = {
  bound: 'bound',
  foreignLeft: 'foreignLeft',
  rightsLost: 'rightsLost',
  removed: 'removed',
  deliveryFailed: 'deliveryFailed',
} as const;

/**
 * Події модуля «Групи». Вони про саму групу сповіщень, тому йдуть власнику особисто (`privateOnly`) і свого топіка
 * не мають. Рядка «бота додано в групу» з кнопками тут немає: він завжди йде в приватний чат власника повз реєстр, без
 * перемикача.
 */
export const GROUPS_UI_NOTIFICATIONS: TelegramNotificationSource = {
  id: GROUPS_MODULE,
  label: 'Групи',
  privateOnly: true,
  events: [
    { type: GROUPS_NOTIFICATION.bound, label: 'Публікацію в групу дозволено', icon: { symbol: 'link', tone: 'green' } },
    { type: GROUPS_NOTIFICATION.foreignLeft, label: 'Бот вийшов з групи: список переповнено', icon: { symbol: 'hand.raised.fill', tone: 'orange' } },
    { type: GROUPS_NOTIFICATION.rightsLost, label: 'У бота забрали права в групі', icon: { symbol: 'lock.fill', tone: 'orange' } },
    { type: GROUPS_NOTIFICATION.removed, label: 'Бота видалили з групи', icon: { symbol: 'person.fill.xmark', tone: 'red' } },
    {
      type: GROUPS_NOTIFICATION.deliveryFailed,
      label: 'Сповіщення не дійшло в групу',
      icon: { symbol: 'exclamationmark.triangle.fill', tone: 'red' },
      default: false,
    },
  ],
};

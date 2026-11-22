/** Лічильники Telegram (namespace telegram.events): value — подія, status `count`. Ключі ті самі, що були в журналі бота. */
export const TELEGRAM_EVENTS_STAT_NS = 'telegram.events';

export const TELEGRAM_METRICS = {
  denied: 'telegram.denied',
  notify: 'telegram.notify',
  notifyFailed: 'telegram.notifyFailed',
} as const;

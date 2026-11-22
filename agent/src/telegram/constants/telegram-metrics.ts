/** Лічильники Telegram (namespace telegram.events): value — подія, status `count`. Ключі ті самі, що були в журналі бота. */
export const TELEGRAM_EVENTS_STAT_NS = 'telegram.events';

export const TELEGRAM_METRICS = {
  denied: 'telegram.denied',
  notify: 'telegram.notify',
  notifyFailed: 'telegram.notifyFailed',
} as const;

/** Команди й кнопки Telegram — виклики бота з джерелом telegram (bot.calls), не telegram.events. */
export const TELEGRAM_COMMANDS_METRIC = 'src.telegram';

/** Id сторінки Telegram → Статистика: на ній select періоду; префікс id її графіків. */
export const TELEGRAM_STATS_PAGE = 'telegram-stats';

/**
 * Виклики бота: subject `transport` / джерело (`mac` | `web` | `telegram`), seriesKey — проксі (`http:tailscale`) або '',
 * value — модуль (`awake`), status — тип (`action` | `screen` | `setting`).
 */
export const BOT_CALLS_STAT_NS = 'bot.calls';
/** Невдалі виклики, та сама форма, що bot.calls. */
export const BOT_ERRORS_STAT_NS = 'bot.errors';
/** Історія старої таблиці bot_metrics (до рушія): value — плаский ключ (`src.web`, `ns.awake`…), status `count`, лише day. */
export const BOT_LEGACY_STAT_NS = 'bot.legacy';
export const BOT_TRANSPORT_SUBJECT = 'transport';

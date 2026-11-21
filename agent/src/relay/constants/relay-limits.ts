/** Скільки останніх сесій viewer-ів тримати в пам'яті для сторінки relay. */
export const RELAY_SESSIONS_LIMIT = 20;
/** Невелика кімната одного користувача. */
export const RELAY_MAX_VIEWERS = 5;
/** Дерево агента більше за дефолтні 64 КБ webhooxy. */
export const RELAY_MAX_PAYLOAD_BYTES = 512 * 1024;
/** Пауза перед повтором після RATE_LIMITED / ROOM_FULL. */
export const RELAY_RETRY_MS = 30_000;

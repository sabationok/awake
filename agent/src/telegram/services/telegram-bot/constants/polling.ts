/** stop() до старту polling повторюємо, інакше бот лишиться слухати після зупинки. */
export const STOP_RETRY_MS = 200;
export const STOP_RETRY_LIMIT = 50;

/** Оновлення, які бот просить у Telegram: повідомлення, кнопки і зміни свого членства в чатах (для груп). */
export const ALLOWED_UPDATES = ['message', 'callback_query', 'my_chat_member'] as const;

/** Скільки оновлень, що прийшли за час простою агента, читаємо на старті, щоб відповісти «повтори». */
export const MISSED_UPDATES_LIMIT = 100;

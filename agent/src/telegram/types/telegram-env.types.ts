/** Токен і чат з ~/.config/awake/telegram.env. Токен не логувати. */
export interface TelegramEnv {
  token: string;
  chatId: string;
  /** Локальний mock Bot API (`http://127.0.0.1:<port>`); null — справжній api.telegram.org. */
  apiRoot: string | null;
}

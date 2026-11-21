/** Чи працює long polling бота і з якого часу (ISO); `since` — останній старт або зупинка. */
export interface TelegramRunState {
  running: boolean;
  since: string | null;
}

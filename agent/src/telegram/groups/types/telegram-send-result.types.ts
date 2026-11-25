/** Чому повідомлення не пішло: бот зупинено, топіка вже немає, Telegram просить зачекати, інше. */
export type TelegramSendFailure =
  | { ok: false; reason: 'stopped' | 'threadNotFound' | 'failed' }
  | { ok: false; reason: 'rateLimited'; retryAfterMs: number };

export type TelegramSendResult = { ok: true } | TelegramSendFailure;

/** Доля сповіщення в групу: надіслано, не вдалося (тоді запасний приватний чат) або випало з повної черги. */
export type GroupDeliveryResult = 'sent' | 'failed' | 'dropped';

import { TelegramError } from 'telegraf';
import type { TelegramSendFailure } from '../types/telegram-send-result.types';

/** Текст відповіді Bot API, коли топіка з таким `message_thread_id` немає (видалили руками). */
const THREAD_NOT_FOUND = /message thread not found/i;

/** Помилка `sendMessage` → що з нею робити: чекати (`429 retry_after`), створити топік заново або здатись. */
export function classifySendError(error: unknown): TelegramSendFailure {
  if (!(error instanceof TelegramError)) return { ok: false, reason: 'failed' };
  if (error.code === 429) return { ok: false, reason: 'rateLimited', retryAfterMs: Math.max(1, error.parameters?.retry_after ?? 1) * 1000 };
  if (error.code === 400 && THREAD_NOT_FOUND.test(error.description)) return { ok: false, reason: 'threadNotFound' };
  return { ok: false, reason: 'failed' };
}

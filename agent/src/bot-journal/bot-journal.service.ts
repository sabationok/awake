import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { BOT_MESSAGE_TEXT_MAX, BOT_MESSAGES_KEEP } from './constants/bot-journal-limits';
import { localDay } from './helpers/local-day';
import { messageMetrics } from './helpers/message-metrics';
import { BotMessagesRepository } from './repositories/bot-messages.repository';
import { BotMetricsRepository } from './repositories/bot-metrics.repository';
import type { BotMessageCreate, BotMessageRecord, BotMetrics, BotRunState } from './types/bot-message.types';

/**
 * Журнал і лічильники Telegram-бота: що прийшло від власника, що бот надіслав, що впало.
 * Пише транспорт (TelegramBotService), читає модуль Bot у MaControl.
 */
@Injectable()
export class BotJournalService {
  /** Журнал або стан бота змінився: сторінки модуля Bot треба перебудувати. */
  readonly changed$ = new Subject<void>();
  private _run: BotRunState = { running: false, since: null };

  constructor(
    private readonly _messages: BotMessagesRepository,
    private readonly _metrics: BotMetricsRepository,
  ) {}

  get run(): BotRunState {
    return this._run;
  }

  record(message: BotMessageCreate, now = new Date()) {
    const text = message.text.length > BOT_MESSAGE_TEXT_MAX ? `${message.text.slice(0, BOT_MESSAGE_TEXT_MAX - 1)}…` : message.text;
    this._messages.create({ ...message, text, at: now.toISOString(), ok: message.ok ?? true, error: message.error ?? null });
    this._messages.deleteBeyond(BOT_MESSAGES_KEEP);
    this._metrics.increment(localDay(now), messageMetrics(message));
    this.changed$.next();
  }

  setRunning(running: boolean, now = new Date()) {
    if (this._run.running === running) return;
    this._run = { running, since: now.toISOString() };
    this.changed$.next();
  }

  findMessages(query: { limit: number }): BotMessageRecord[] {
    return this._messages.findMany(query);
  }

  metrics(now = new Date()): BotMetrics {
    return { today: this._metrics.sum({ day: localDay(now) }), total: this._metrics.sum({}) };
  }
}

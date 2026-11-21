import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { BOT_EVENT_NAME_MAX, BOT_EVENTS_KEEP } from './constants/bot-journal-limits';
import { eventMetrics } from './helpers/event-metrics';
import { localDay } from './helpers/local-day';
import { BotEventsRepository } from './repositories/bot-events.repository';
import { BotMetricsRepository } from './repositories/bot-metrics.repository';
import type { BotEventCreate, BotEventRecord, BotMetrics } from './types/bot-event.types';

/**
 * Журнал і лічильники нашого бота (BotRouterService): кожна дія, екран і налаштування з будь-якого транспорту.
 * Пише ModulesService, читає модуль Bot. Транспорти можуть додати свої лічильники через `count` (Telegram: сповіщення).
 */
@Injectable()
export class BotJournalService {
  /** Журнал змінився: сторінки модуля Bot треба перебудувати. */
  readonly changed$ = new Subject<void>();

  constructor(
    private readonly _events: BotEventsRepository,
    private readonly _metrics: BotMetricsRepository,
  ) {}

  record(event: BotEventCreate, now = new Date()) {
    const name = event.name.length > BOT_EVENT_NAME_MAX ? `${event.name.slice(0, BOT_EVENT_NAME_MAX - 1)}…` : event.name;
    this._events.create({ ...event, name, at: now.toISOString(), ok: event.ok ?? true, error: event.error ?? null });
    this._events.deleteBeyond(BOT_EVENTS_KEEP);
    this.count(eventMetrics(event), now);
  }

  /** Лічильники без запису в журнал. */
  count(metrics: string[], now = new Date()) {
    this._metrics.increment(localDay(now), metrics);
    this.changed$.next();
  }

  findEvents(query: { limit: number }): BotEventRecord[] {
    return this._events.findMany(query);
  }

  metrics(now = new Date()): BotMetrics {
    return { today: this._metrics.sum({ day: localDay(now) }), total: this._metrics.sum({}) };
  }
}

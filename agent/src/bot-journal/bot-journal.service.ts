import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { StatGranularity } from '@awake/contracts';
import { flattenStatTotals, mergeStatCounters, StatsService } from '../stats';
import { BOT_CALLS_STAT_NS, BOT_ERRORS_STAT_NS, BOT_LEGACY_STAT_NS, BOT_TRANSPORT_SUBJECT } from './constants/bot-stats';
import { BOT_EVENT_NAME_MAX, BOT_EVENTS_KEEP } from './constants/bot-journal-limits';
import { botCountersOf } from './helpers/bot-counters-of';
import type { CreateBotEventDto } from './dto/create-bot-event.dto';
import type { BotEventEntity } from './entities/bot-event.entity';
import { FindManyBotEventsQuery } from './query/find-many-bot-events.query';
import { BotEventsRepository } from './repositories/bot-events.repository';
import type { BotEventCreate, BotMetrics } from './types/bot-event.types';

/** Хвилини — для графіків «Година» на сторінках статистики. */
const GRANULARITIES = [StatGranularity.MINUTE, StatGranularity.HOUR, StatGranularity.DAY, StatGranularity.WEEK, StatGranularity.MONTH];

/**
 * Журнал і лічильники нашого бота (BotRouterService): кожна дія, екран і налаштування з будь-якого транспорту.
 * Пише ModulesService, читає модуль Bot. Лічильники — у stats-рушії (bot.calls, bot.errors); свої лічильники
 * транспорти ведуть у своїх namespace (Telegram — telegram.events).
 */
@Injectable()
export class BotJournalService {
  /** Журнал змінився: сторінки модуля Bot треба перебудувати. */
  readonly changed$ = new Subject<void>();

  constructor(
    private readonly _events: BotEventsRepository,
    private readonly _stats: StatsService,
  ) {}

  record(event: BotEventCreate, now = new Date()) {
    const name = event.name.length > BOT_EVENT_NAME_MAX ? `${event.name.slice(0, BOT_EVENT_NAME_MAX - 1)}…` : event.name;
    const dto: CreateBotEventDto = {
      at: now.toISOString(),
      source: event.source,
      type: event.type,
      namespace: event.namespace,
      name,
      ok: event.ok ?? true,
      error: event.error ?? null,
      proxy: event.proxy ?? null,
    };
    this._events.create(dto);
    this._events.deleteBeyond(BOT_EVENTS_KEEP);
    const series = { subjectType: BOT_TRANSPORT_SUBJECT, subjectId: event.source, seriesKey: event.proxy ?? '', granularities: GRANULARITIES, at: now };
    const metrics = { [event.namespace]: { [event.type]: 1 } };
    this._stats.increment({ ...series, namespace: BOT_CALLS_STAT_NS, metrics });
    if (event.ok === false) this._stats.increment({ ...series, namespace: BOT_ERRORS_STAT_NS, metrics });
    this.changed$.next();
  }

  /** Від найновішої. */
  findEvents(query: FindManyBotEventsQuery): BotEventEntity[] {
    return this._events.findMany(query, { order: { id: 'DESC' } });
  }

  /** Сьогодні (UTC-день) / за весь час, плаский вигляд для сторінок, разом з історією до рушія. */
  metrics(now = new Date()): BotMetrics {
    const calls = this._stats.seriesTotals({ namespace: BOT_CALLS_STAT_NS }, now);
    const errors = this._stats.seriesTotals({ namespace: BOT_ERRORS_STAT_NS }, now);
    return mergeStatCounters(
      { today: botCountersOf(calls.today, errors.today), total: botCountersOf(calls.total, errors.total) },
      flattenStatTotals(this._stats.totals({ namespace: BOT_LEGACY_STAT_NS }, now)),
    );
  }
}

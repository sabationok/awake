import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { StatGranularity, type MacToAgentMessage, type SessionRecord, type StatMetrics } from '@awake/contracts';
import { statNextPeriodStart, statPeriodStart, StatsService } from '../stats';
import { AWAKE_SESSIONS_STAT_NS, AWAKE_TIME_STAT_NS, SESSION_STAT_GRANULARITIES } from './constants/session-stats';
import { SessionsRepository } from './repositories/sessions.repository';
import type { SessionsHistory, SessionsPeriod } from './types/sessions-history.types';

type SessionEvent = Extract<MacToAgentMessage, { type: 'session' }>['data'];

const GRANULARITIES = SESSION_STAT_GRANULARITIES.map((g) => g as StatGranularity);
const HISTORY = { days: 7, weeks: 8, months: 6 };

const sumMetrics = (metrics: StatMetrics) => Object.values(metrics).reduce((sum, statuses) => sum + Object.values(statuses).reduce((a, b) => a + b, 0), 0);

@Injectable()
export class SessionsService implements OnModuleInit {
  private readonly _logger = new Logger(SessionsService.name);

  constructor(
    private readonly _sessions: SessionsRepository,
    private readonly _stats: StatsService,
  ) {}

  /** Історія до появи статистики — один раз, з таблиці sessions. Далі лічильники ведуть події. */
  onModuleInit() {
    if (this._stats.hasNamespace(AWAKE_SESSIONS_STAT_NS)) return;
    const sessions = this._sessions.findAll();
    for (const session of sessions) {
      this._countStart(session.startedAt, session.source);
      if (session.endedAt) this._trackTime(session, session.endedAt);
    }
    this._stats.flush();
    if (sessions.length) this._logger.log(`sessions history moved into stats: ${sessions.length}`);
  }

  /** start і restart відкривають нову сесію, stop закриває поточну. */
  applyEvent(event: SessionEvent) {
    const battery = event.battery ?? null;
    switch (event.event) {
      case 'start':
        // Незакрита сесія перед новим стартом означає збій: аппку вбили під час сесії.
        this._closeOpen({ endedAt: event.at, endReason: 'перервано', batteryEnd: null });
        this._open(event, battery);
        return;
      case 'restart':
        this._closeOpen({ endedAt: event.at, endReason: 'перезапуск', batteryEnd: battery });
        this._open(event, battery);
        return;
      case 'stop':
        this._closeOpen({ endedAt: event.at, endReason: event.reason ?? null, batteryEnd: battery });
        return;
    }
  }

  findMany(query: { limit: number }): SessionRecord[] {
    return this._sessions.findMany(query);
  }

  /** Таймлайн: скільки сесій і скільки часу по днях (локальних), тижнях і місяцях. Відкрита сесія — без часу, доки не закриється. */
  history(now = new Date()): SessionsHistory {
    return {
      days: this._localDays(now),
      weeks: this._periods(StatGranularity.WEEK, HISTORY.weeks, now),
      months: this._periods(StatGranularity.MONTH, HISTORY.months, now),
    };
  }

  private _open(event: SessionEvent, battery: number | null) {
    this._sessions.create({ startedAt: event.at, duration: event.duration ?? null, source: event.source, batteryStart: battery });
    this._countStart(event.at, event.source);
  }

  private _closeOpen(data: { endedAt: string; endReason: string | null; batteryEnd: number | null }) {
    const open = this._sessions.findOpen();
    this._sessions.closeOpen(data);
    if (open) this._trackTime(open, data.endedAt);
  }

  private _countStart(at: string, source: string) {
    this._stats.increment({ namespace: AWAKE_SESSIONS_STAT_NS, granularities: GRANULARITIES, at: new Date(at), metrics: { [source]: { count: 1 } } });
  }

  private _trackTime(session: SessionRecord, endedAt: string) {
    this._stats.incrementDuration({
      namespace: AWAKE_TIME_STAT_NS,
      granularities: GRANULARITIES,
      value: session.source,
      start: new Date(session.startedAt),
      end: new Date(endedAt),
    });
  }

  /** Останні `count` періодів, поточний включно. */
  private _periods(granularity: StatGranularity, count: number, now: Date): SessionsPeriod[] {
    let from = statPeriodStart(now, granularity);
    for (let i = 1; i < count; i++) from = statPeriodStart(new Date(from.getTime() - 1), granularity);
    const to = statNextPeriodStart(statPeriodStart(now, granularity), granularity);
    return this._series(granularity, from, to).map(([start, value]) => ({ start: new Date(start), ...value }));
  }

  /** Дні за локальним часом Mac (рушій збирає їх з годинних бакетів). */
  private _localDays(now: Date): SessionsPeriod[] {
    const counts = this._stats.localDays({ namespace: AWAKE_SESSIONS_STAT_NS }, HISTORY.days, now);
    const times = this._stats.localDays({ namespace: AWAKE_TIME_STAT_NS }, HISTORY.days, now);
    return counts.map((day, i) => ({ start: day.start, count: sumMetrics(day.metrics), seconds: sumMetrics(times[i]?.metrics ?? {}) }));
  }

  /** Точки обох серій поруч: [початок періоду, { count, seconds }]. */
  private _series(granularity: StatGranularity, from: Date, to: Date): [string, { count: number; seconds: number }][] {
    const counts = this._stats.timeline({ namespace: AWAKE_SESSIONS_STAT_NS, granularity, from, to });
    const times = this._stats.timeline({ namespace: AWAKE_TIME_STAT_NS, granularity, from, to });
    return counts.points.map((point, i) => [point.periodStart, { count: sumMetrics(point.metrics), seconds: sumMetrics(times.points[i]?.metrics ?? {}) }]);
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { StatGranularity, type MacToAgentMessage, type SessionRecord, type UiChartPoint } from '@macontrol/contracts';
import { StatsService, totalChartPoints, type StatsPeriodWindow } from '../stats';
import { AWAKE_SESSIONS_STAT_NS, AWAKE_TIME_STAT_NS, SESSION_STAT_GRANULARITIES } from './constants/session-stats';
import { CloseSessionDto } from './dto/close-session.dto';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { SessionEntity } from './entities/session.entity';
import { FindManySessionsQuery } from './query/find-many-sessions.query';
import { SessionsRepository } from './repositories/sessions.repository';

type SessionEvent = Extract<MacToAgentMessage, { type: 'session' }>['data'];

const GRANULARITIES = SESSION_STAT_GRANULARITIES.map((g) => g as StatGranularity);

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
    const sessions = this._sessions.findMany({}, { order: { startedAt: 'ASC' } });
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

  /** Від найновішої. */
  findMany(query: FindManySessionsQuery): SessionEntity[] {
    return this._sessions.findMany(query, { order: { startedAt: 'DESC' } });
  }

  /** Точки графіка трекінгу за вікно: скільки сесій почалось або скільки секунд Mac не спав (закриті сесії). */
  chartPoints(kind: 'count' | 'seconds', window: StatsPeriodWindow): UiChartPoint[] {
    const namespace = kind === 'count' ? AWAKE_SESSIONS_STAT_NS : AWAKE_TIME_STAT_NS;
    return totalChartPoints(this._stats.timeline({ namespace, granularity: window.granularity, from: window.from, to: window.to }));
  }

  private _open(event: SessionEvent, battery: number | null) {
    const dto: CreateSessionDto = { startedAt: event.at, duration: event.duration ?? null, source: event.source, batteryStart: battery };
    this._sessions.create(dto);
    this._countStart(event.at, event.source);
  }

  private _closeOpen(dto: CloseSessionDto) {
    const open = this._sessions.findOne({ ended: false }, { order: { startedAt: 'DESC' } });
    if (!open) return;
    this._sessions.update({ ended: false }, dto);
    this._trackTime(open, dto.endedAt);
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
}

import { Injectable } from '@nestjs/common';
import type { SessionSource, SleepTimerRecord } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

interface SleepTimerRow {
  id: number;
  started_at: string;
  sleep_at: string;
  minutes: number;
  ended_at: string | null;
  source: SessionSource;
  end_reason: string | null;
}

const toRecord = (row: SleepTimerRow): SleepTimerRecord => ({
  id: row.id,
  startedAt: row.started_at,
  sleepAt: row.sleep_at,
  minutes: row.minutes,
  endedAt: row.ended_at,
  source: row.source,
  endReason: row.end_reason,
});

@Injectable()
export class SleepTimersRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: { startedAt: string; sleepAt: string; minutes: number; source: SessionSource }) {
    this._database.db
      .prepare('INSERT INTO sleep_timers (started_at, sleep_at, minutes, source) VALUES (?, ?, ?, ?)')
      .run(data.startedAt, data.sleepAt, data.minutes, data.source);
  }

  /** Закриває незавершений таймер, якщо він є. */
  closeOpen(data: { endedAt: string; endReason: string | null }) {
    this._database.db
      .prepare('UPDATE sleep_timers SET ended_at = ?, end_reason = ? WHERE ended_at IS NULL')
      .run(data.endedAt, data.endReason);
  }

  findMany(query: { limit: number }): SleepTimerRecord[] {
    const rows = this._database.db
      .prepare('SELECT * FROM sleep_timers ORDER BY started_at DESC LIMIT ?')
      .all(query.limit) as unknown as SleepTimerRow[];
    return rows.map(toRecord);
  }
}

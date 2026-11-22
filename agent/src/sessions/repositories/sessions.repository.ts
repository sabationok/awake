import { Injectable } from '@nestjs/common';
import type { SessionRecord, SessionSource } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

interface SessionRow {
  id: number;
  started_at: string;
  ended_at: string | null;
  duration: string | null;
  source: SessionSource;
  end_reason: string | null;
  battery_start: number | null;
  battery_end: number | null;
}

const toRecord = (row: SessionRow): SessionRecord => ({
  id: row.id,
  startedAt: row.started_at,
  endedAt: row.ended_at,
  duration: row.duration,
  source: row.source,
  endReason: row.end_reason,
  batteryStart: row.battery_start,
  batteryEnd: row.battery_end,
});

@Injectable()
export class SessionsRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: { startedAt: string; duration: string | null; source: SessionSource; batteryStart: number | null }) {
    this._database.db
      .prepare('INSERT INTO sessions (started_at, duration, source, battery_start) VALUES (?, ?, ?, ?)')
      .run(data.startedAt, data.duration, data.source, data.batteryStart);
  }

  /** Закриває незавершену сесію, якщо вона є. */
  closeOpen(data: { endedAt: string; endReason: string | null; batteryEnd: number | null }) {
    this._database.db
      .prepare('UPDATE sessions SET ended_at = ?, end_reason = ?, battery_end = ? WHERE ended_at IS NULL')
      .run(data.endedAt, data.endReason, data.batteryEnd);
  }

  findOpen(): SessionRecord | null {
    const row = this._database.db.prepare('SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1').get() as SessionRow | undefined;
    return row ? toRecord(row) : null;
  }

  /** Усі сесії від найстарішої: для одноразового перенесення історії в статистику. */
  findAll(): SessionRecord[] {
    return (this._database.db.prepare('SELECT * FROM sessions ORDER BY started_at').all() as unknown as SessionRow[]).map(toRecord);
  }

  findMany(query: { limit: number }): SessionRecord[] {
    const rows = this._database.db
      .prepare('SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?')
      .all(query.limit) as unknown as SessionRow[];
    return rows.map(toRecord);
  }
}

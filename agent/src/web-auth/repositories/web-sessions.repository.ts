import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface WebSessionRow {
  id: string;
  deviceId: number;
  idleMinutes: number;
  lastActiveAt: string;
}

@Injectable()
export class WebSessionsRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: { id: string; tokenHash: string; deviceId: number; idleMinutes: number; at: string }) {
    this._database.db
      .prepare(
        'INSERT INTO web_sessions (id, token_hash, device_id, idle_minutes, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(data.id, data.tokenHash, data.deviceId, data.idleMinutes, data.at, data.at);
  }

  /** Невідкликана сесія цього пристрою за хешем токена; таймаут перевіряє сервіс. */
  findActive(tokenHash: string, deviceId: number): WebSessionRow | null {
    const row = this._database.db
      .prepare(
        `SELECT id, device_id AS deviceId, idle_minutes AS idleMinutes, last_active_at AS lastActiveAt
         FROM web_sessions WHERE token_hash = ? AND device_id = ? AND revoked_at IS NULL`,
      )
      .get(tokenHash, deviceId) as WebSessionRow | undefined;
    return row ?? null;
  }

  findById(id: string): WebSessionRow | null {
    const row = this._database.db
      .prepare('SELECT id, device_id AS deviceId, idle_minutes AS idleMinutes, last_active_at AS lastActiveAt FROM web_sessions WHERE id = ? AND revoked_at IS NULL')
      .get(id) as WebSessionRow | undefined;
    return row ?? null;
  }

  touch(id: string, at: string) {
    this._database.db.prepare('UPDATE web_sessions SET last_active_at = ? WHERE id = ?').run(at, id);
  }

  revoke(id: string, at: string) {
    this._database.db.prepare('UPDATE web_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(at, id);
  }

  /** Відкликані давно й ті, чий останній рух старший за межу (таймаут не буває довшим за 10 хв). */
  prune(before: string) {
    this._database.db
      .prepare('DELETE FROM web_sessions WHERE (revoked_at IS NOT NULL AND revoked_at < ?) OR last_active_at < ?')
      .run(before, before);
  }
}

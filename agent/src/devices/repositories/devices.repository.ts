import { Injectable } from '@nestjs/common';
import type { DevicePairingMode } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

export interface DeviceRow {
  id: number;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  via: DevicePairingMode;
}

@Injectable()
export class DevicesRepository {
  constructor(private readonly _database: DatabaseService) {}

  /** Новий пристрій; повертає його id. */
  create(data: { tokenHash: string; userAgent: string | null; createdAt: string; via: DevicePairingMode }): number {
    const result = this._database.db
      .prepare('INSERT INTO devices (token_hash, user_agent, created_at, via) VALUES (?, ?, ?, ?)')
      .run(data.tokenHash, data.userAgent, data.createdAt, data.via);
    return Number(result.lastInsertRowid);
  }

  list(): DeviceRow[] {
    return this._database.db
      .prepare(
        'SELECT id, user_agent AS userAgent, created_at AS createdAt, last_seen_at AS lastSeenAt, via FROM devices ORDER BY created_at DESC',
      )
      .all() as unknown as DeviceRow[];
  }

  exists(id: number): boolean {
    return this._database.db.prepare('SELECT 1 FROM devices WHERE id = ?').get(id) !== undefined;
  }

  /** Видаляє пристрій: його токен одразу перестає діяти, його вебсесії видаляє каскад. */
  remove(id: number): boolean {
    return Number(this._database.db.prepare('DELETE FROM devices WHERE id = ?').run(id).changes) > 0;
  }

  /**
   * Позначає пристрій як щойно бачений. Повертає його id, user agent і коли його бачили перед цим,
   * або null, якщо такого токена на цьому шляху немає.
   */
  touch(tokenHash: string, via: DevicePairingMode, at: string): { id: number; userAgent: string | null; previousSeenAt: string | null } | null {
    const row = this._database.db
      .prepare('SELECT id, user_agent AS userAgent, last_seen_at AS previousSeenAt FROM devices WHERE token_hash = ? AND via = ?')
      .get(tokenHash, via) as { id: number; userAgent: string | null; previousSeenAt: string | null } | undefined;
    if (!row) return null;
    this._database.db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(at, row.id);
    return row;
  }
}

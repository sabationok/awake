import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DevicesRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: { tokenHash: string; userAgent: string | null; createdAt: string }) {
    this._database.db
      .prepare('INSERT INTO devices (token_hash, user_agent, created_at) VALUES (?, ?, ?)')
      .run(data.tokenHash, data.userAgent, data.createdAt);
  }

  list(): { id: number; userAgent: string | null; createdAt: string; lastSeenAt: string | null }[] {
    return this._database.db
      .prepare(
        'SELECT id, user_agent AS userAgent, created_at AS createdAt, last_seen_at AS lastSeenAt FROM devices ORDER BY created_at DESC',
      )
      .all() as { id: number; userAgent: string | null; createdAt: string; lastSeenAt: string | null }[];
  }

  /** Видаляє пристрій: його токен одразу перестає діяти. */
  remove(id: number): boolean {
    return Number(this._database.db.prepare('DELETE FROM devices WHERE id = ?').run(id).changes) > 0;
  }

  /** Позначає пристрій як щойно бачений. Повертає false, якщо такого токена немає. */
  touch(tokenHash: string, at: string): boolean {
    const result = this._database.db.prepare('UPDATE devices SET last_seen_at = ? WHERE token_hash = ?').run(at, tokenHash);
    return Number(result.changes) > 0;
  }
}

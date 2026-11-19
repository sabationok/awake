import { Injectable } from '@nestjs/common';
import type { LogRecord } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class LogsRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: { at: string; text: string }) {
    this._database.db.prepare('INSERT INTO logs (at, text) VALUES (?, ?)').run(data.at, data.text);
  }

  findMany(query: { limit: number }): LogRecord[] {
    return this._database.db
      .prepare('SELECT id, at, text FROM logs ORDER BY id DESC LIMIT ?')
      .all(query.limit) as unknown as LogRecord[];
  }

  deleteOlderThan(at: string) {
    this._database.db.prepare('DELETE FROM logs WHERE at < ?').run(at);
  }
}

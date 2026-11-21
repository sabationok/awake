import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { BotEventRecord } from '../types/bot-event.types';

type BotEventRow = Omit<BotEventRecord, 'ok'> & { ok: number };

@Injectable()
export class BotEventsRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: Omit<BotEventRecord, 'id'>) {
    this._database.db
      .prepare('INSERT INTO bot_events (at, source, type, namespace, name, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(data.at, data.source, data.type, data.namespace, data.name, data.ok ? 1 : 0, data.error);
  }

  findMany(query: { limit: number }): BotEventRecord[] {
    const rows = this._database.db
      .prepare('SELECT id, at, source, type, namespace, name, ok, error FROM bot_events ORDER BY id DESC LIMIT ?')
      .all(query.limit) as unknown as BotEventRow[];
    return rows.map((row) => ({ ...row, ok: row.ok === 1 }));
  }

  /** Лишає `keep` останніх записів. */
  deleteBeyond(keep: number) {
    this._database.db
      .prepare('DELETE FROM bot_events WHERE id <= (SELECT id FROM bot_events ORDER BY id DESC LIMIT 1 OFFSET ?)')
      .run(keep);
  }
}

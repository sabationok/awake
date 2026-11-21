import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { BotMessageRecord } from '../types/bot-message.types';

type BotMessageRow = Omit<BotMessageRecord, 'ok'> & { ok: number };

@Injectable()
export class BotMessagesRepository {
  constructor(private readonly _database: DatabaseService) {}

  create(data: Omit<BotMessageRecord, 'id'>) {
    this._database.db
      .prepare('INSERT INTO bot_messages (at, direction, type, namespace, text, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(data.at, data.direction, data.type, data.namespace, data.text, data.ok ? 1 : 0, data.error);
  }

  findMany(query: { limit: number }): BotMessageRecord[] {
    const rows = this._database.db
      .prepare('SELECT id, at, direction, type, namespace, text, ok, error FROM bot_messages ORDER BY id DESC LIMIT ?')
      .all(query.limit) as unknown as BotMessageRow[];
    return rows.map((row) => ({ ...row, ok: row.ok === 1 }));
  }

  /** Лишає `keep` останніх записів. */
  deleteBeyond(keep: number) {
    this._database.db
      .prepare('DELETE FROM bot_messages WHERE id <= (SELECT id FROM bot_messages ORDER BY id DESC LIMIT 1 OFFSET ?)')
      .run(keep);
  }
}

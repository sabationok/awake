import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class MetricsRepository {
  constructor(private readonly _database: DatabaseService) {}

  /** `by` може бути від'ємним (decr): лічильник дня зменшується, але рядок лишається. */
  add(day: string, scope: string, metric: string, by: number) {
    this._database.db
      .prepare(
        'INSERT INTO metrics (day, scope, metric, value) VALUES (?, ?, ?, ?) ON CONFLICT (day, scope, metric) DO UPDATE SET value = value + excluded.value',
      )
      .run(day, scope, metric, by);
  }

  /** Лічильники одного scope за день, або за всі дні разом, коли `day` не задано. */
  sum(query: { scope: string; day?: string }): Record<string, number> {
    const rows = (
      query.day
        ? this._database.db.prepare('SELECT metric, value FROM metrics WHERE scope = ? AND day = ?').all(query.scope, query.day)
        : this._database.db.prepare('SELECT metric, SUM(value) AS value FROM metrics WHERE scope = ? GROUP BY metric').all(query.scope)
    ) as unknown as { metric: string; value: number }[];
    return Object.fromEntries(rows.map((row) => [row.metric, Number(row.value)]));
  }
}

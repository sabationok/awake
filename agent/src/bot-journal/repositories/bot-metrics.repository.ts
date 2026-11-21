import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class BotMetricsRepository {
  constructor(private readonly _database: DatabaseService) {}

  increment(day: string, metrics: string[]) {
    const statement = this._database.db.prepare(
      'INSERT INTO bot_metrics (day, metric, value) VALUES (?, ?, 1) ON CONFLICT (day, metric) DO UPDATE SET value = value + 1',
    );
    for (const metric of metrics) statement.run(day, metric);
  }

  /** Лічильники одного дня, або всіх днів разом, коли `day` не задано. */
  sum(query: { day?: string }): Record<string, number> {
    const rows = (
      query.day
        ? this._database.db.prepare('SELECT metric, value FROM bot_metrics WHERE day = ?').all(query.day)
        : this._database.db.prepare('SELECT metric, SUM(value) AS value FROM bot_metrics GROUP BY metric').all()
    ) as unknown as { metric: string; value: number }[];
    return Object.fromEntries(rows.map((row) => [row.metric, Number(row.value)]));
  }
}

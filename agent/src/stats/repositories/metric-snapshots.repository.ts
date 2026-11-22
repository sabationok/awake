import { Injectable } from '@nestjs/common';
import type { StatGranularity, StatMetrics } from '@awake/contracts';
import { DatabaseService } from '../../database/database.service';
import { addStatMetrics } from '../helpers/add-stat-metrics';
import type { StatBucket, StatFilter } from '../types/stat-bucket.types';

/** Рядок агрегату: одна клітинка value × status у бакеті. */
export interface StatCellRow {
  periodStart: string;
  value: string;
  status: string;
  count: number;
}

/** Сума клітинки за діапазон в одній серії. */
export interface StatSeriesCellRow {
  subjectType: string;
  subjectId: string | null;
  seriesKey: string;
  value: string;
  status: string;
  count: number;
}

/** metric_snapshots у SQLite. Глобальна серія зберігається з subject_id '' (NULL у первинному ключі SQLite не конфліктує). */
@Injectable()
export class MetricSnapshotsRepository {
  constructor(private readonly _database: DatabaseService) {}

  /**
   * Додає дельти до бакетів однією транзакцією. Додавання, а не заміна (на відміну від Redis-варіанту скіла):
   * пам'ять процесу не переживає перезапуск, і заміна зменшила б підсумок. Один процес — подвійного flush немає.
   */
  addBatch(buckets: StatBucket[], at: string) {
    const db = this._database.db;
    const select = db.prepare(
      'SELECT metrics FROM metric_snapshots WHERE namespace = ? AND subject_type = ? AND subject_id = ? AND series_key = ? AND granularity = ? AND period_start = ?',
    );
    const upsert = db.prepare(
      `INSERT INTO metric_snapshots (namespace, subject_type, subject_id, series_key, granularity, period_start, metrics, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (namespace, subject_type, subject_id, series_key, granularity, period_start)
       DO UPDATE SET metrics = excluded.metrics, updated_at = excluded.updated_at`,
    );
    db.exec('BEGIN');
    try {
      for (const bucket of buckets) {
        const key = [bucket.namespace, bucket.subjectType, bucket.subjectId ?? '', bucket.seriesKey, bucket.granularity, bucket.periodStart.toISOString()] as const;
        const row = select.get(...key) as { metrics: string } | undefined;
        const metrics = addStatMetrics(row ? (JSON.parse(row.metrics) as StatMetrics) : {}, bucket.metrics);
        upsert.run(...key, JSON.stringify(metrics), at);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Сума клітинок за бакетами (дві розгортки JSON → SUM). */
  sumCells(filter: StatFilter): StatCellRow[] {
    const { where, params } = this._where(filter);
    const rows = this._database.db
      .prepare(
        `SELECT m.period_start AS periodStart, v.key AS value, s.key AS status, SUM(s.value) AS count
         FROM metric_snapshots m, json_each(m.metrics) v, json_each(v.value) s
         WHERE ${where} GROUP BY m.period_start, v.key, s.key`,
      )
      .all(...params) as unknown as StatCellRow[];
    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  /** Сума за весь діапазон з розрізом по серіях (subject, seriesKey): для лічильників з кількома вимірами. */
  sumSeries(filter: StatFilter): StatSeriesCellRow[] {
    const { where, params } = this._where(filter);
    const rows = this._database.db
      .prepare(
        `SELECT m.subject_type AS subjectType, m.subject_id AS subjectId, m.series_key AS seriesKey, v.key AS value, s.key AS status, SUM(s.value) AS count
         FROM metric_snapshots m, json_each(m.metrics) v, json_each(v.value) s
         WHERE ${where} GROUP BY m.subject_type, m.subject_id, m.series_key, v.key, s.key`,
      )
      .all(...params) as unknown as StatSeriesCellRow[];
    return rows.map((row) => ({ ...row, subjectId: row.subjectId === '' ? null : row.subjectId, count: Number(row.count) }));
  }

  hasNamespace(namespace: string): boolean {
    return !!this._database.db.prepare('SELECT 1 FROM metric_snapshots WHERE namespace = ? LIMIT 1').get(namespace);
  }

  deleteOlderThan(granularity: StatGranularity, before: Date): number {
    const result = this._database.db
      .prepare('DELETE FROM metric_snapshots WHERE granularity = ? AND period_start < ?')
      .run(granularity, before.toISOString());
    return Number(result.changes);
  }

  private _where(filter: StatFilter): { where: string; params: string[] } {
    const where = ['m.namespace = ?', 'm.granularity = ?'];
    const params: string[] = [filter.namespace, filter.granularity];
    if (filter.subjectType !== undefined) {
      where.push('m.subject_type = ?');
      params.push(filter.subjectType);
    }
    if (filter.subjectId !== undefined) {
      where.push('m.subject_id = ?');
      params.push(filter.subjectId ?? '');
    }
    if (filter.seriesKey !== undefined) {
      where.push('m.series_key = ?');
      params.push(filter.seriesKey);
    }
    if (filter.from) {
      where.push('m.period_start >= ?');
      params.push(filter.from.toISOString());
    }
    if (filter.to) {
      where.push('m.period_start < ?');
      params.push(filter.to.toISOString());
    }
    return { where: where.join(' AND '), params };
  }
}

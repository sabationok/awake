import { EntityRepository, LessThan, MoreThanOrEqual, SqliteRepository, type SqliteWhereBuilder, type SqliteWhereQuery } from '@nest-kit/sqlite';
import { MetricSnapshotEntity } from '../entities/metric-snapshot.entity';
import type { UpsertMetricSnapshotDto } from '../dto/upsert-metric-snapshot.dto';
import { addStatMetrics } from '../helpers/add-stat-metrics';
import { FindManyMetricSnapshotsQuery } from '../query/find-many-metric-snapshots.query';
import { FindOneMetricSnapshotQuery } from '../query/find-one-metric-snapshot.query';
import type { StatBucket, StatFilter } from '../types/stat-bucket.types';
import type { StatCellRow, StatSeriesCellRow } from '../types/stat-cell.types';

export type { StatCellRow, StatSeriesCellRow } from '../types/stat-cell.types';

type SnapshotQuery = SqliteWhereQuery<FindOneMetricSnapshotQuery, FindManyMetricSnapshotsQuery>;

/** metric_snapshots у SQLite. Агрегати — через `_qb()` з `json_each`, SQL-тексту тут немає. */
@EntityRepository(MetricSnapshotEntity)
export class MetricSnapshotsRepository extends SqliteRepository<MetricSnapshotEntity, FindOneMetricSnapshotQuery, FindManyMetricSnapshotsQuery> {
  /**
   * Додає дельти до бакетів однією транзакцією. Додавання, а не заміна (на відміну від Redis-варіанту скіла):
   * пам'ять процесу не переживає перезапуск, і заміна зменшила б підсумок. Один процес — подвійного flush немає.
   */
  addBatch(buckets: StatBucket[], at: string) {
    this._transaction(() => {
      for (const bucket of buckets) {
        const key: FindOneMetricSnapshotQuery = {
          namespace: bucket.namespace,
          subjectType: bucket.subjectType,
          subjectId: bucket.subjectId ?? '',
          seriesKey: bucket.seriesKey,
          granularity: bucket.granularity,
          periodStart: bucket.periodStart.toISOString(),
        };
        const existing = this.findOne(key, { select: ['metrics'] });
        const dto: UpsertMetricSnapshotDto = { ...key, metrics: addStatMetrics(existing?.metrics ?? {}, bucket.metrics), updatedAt: at };
        this.upsert(dto, { conflict: ['namespace', 'subjectType', 'subjectId', 'seriesKey', 'granularity', 'periodStart'], update: ['metrics', 'updatedAt'] });
      }
    });
  }

  /** Сума клітинок value × status за бакетами. */
  sumCells(filter: StatFilter): StatCellRow[] {
    return this._qb('m')
      .jsonEach('v', 'm.metrics')
      .jsonEach('s', 'v.value')
      .select({ periodStart: 'm.periodStart', value: 'v.key', status: 's.key' })
      .sum('s.value', 'count')
      .applyQuery(filter)
      .groupBy('m.periodStart', 'v.key', 's.key')
      .getRawMany<StatCellRow>();
  }

  /** Сума за весь діапазон з розрізом по серіях (subject, seriesKey): для лічильників з кількома вимірами. */
  sumSeries(filter: StatFilter): StatSeriesCellRow[] {
    return this._qb('m')
      .jsonEach('v', 'm.metrics')
      .jsonEach('s', 'v.value')
      .select({ subjectType: 'm.subjectType', subjectId: 'm.subjectId', seriesKey: 'm.seriesKey', value: 'v.key', status: 's.key' })
      .sum('s.value', 'count')
      .applyQuery(filter)
      .groupBy('m.subjectType', 'm.subjectId', 'm.seriesKey', 'v.key', 's.key')
      .getRawMany<StatSeriesCellRow>()
      .map((row) => ({ ...row, subjectId: row.subjectId === '' ? null : row.subjectId }));
  }

  protected override _applyWhere(where: SqliteWhereBuilder<MetricSnapshotEntity>, query: SnapshotQuery): void {
    const { subjectId, from, to, ...rest } = query;
    super._applyWhere(where, rest);
    if (subjectId !== undefined) where.field('subjectId', subjectId ?? '');
    if (from) where.field('periodStart', MoreThanOrEqual(from.toISOString()));
    if (to) where.field('periodStart', LessThan(to.toISOString()));
  }
}

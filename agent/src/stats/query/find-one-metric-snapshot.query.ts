import type { MetricSnapshotEntity } from '../entities/metric-snapshot.entity';

/** Бакет за повним ключем. */
export class FindOneMetricSnapshotQuery implements Pick<MetricSnapshotEntity, 'namespace' | 'subjectType' | 'subjectId' | 'seriesKey' | 'granularity' | 'periodStart'> {
  namespace!: string;
  subjectType!: string;
  subjectId!: string;
  seriesKey!: string;
  granularity!: MetricSnapshotEntity['granularity'];
  periodStart!: string;
}

import type { MetricSnapshotEntity } from '../entities/metric-snapshot.entity';

export class UpsertMetricSnapshotDto implements MetricSnapshotEntity {
  namespace!: string;
  subjectType!: string;
  subjectId!: string;
  seriesKey!: string;
  granularity!: MetricSnapshotEntity['granularity'];
  periodStart!: string;
  metrics!: MetricSnapshotEntity['metrics'];
  updatedAt!: string;
}

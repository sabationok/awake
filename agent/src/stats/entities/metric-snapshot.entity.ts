import type { StatGranularity, StatMetrics } from '@awake/contracts';
import { Column, Entity, Index, PrimaryColumn } from '@nest-kit/sqlite';

/** Бакет статистики. Глобальна серія — `subjectId` '' (NULL у первинному ключі SQLite не конфліктує). */
@Entity('metric_snapshots')
@Index(['granularity', 'periodStart'], { name: 'metric_snapshots_period' })
export class MetricSnapshotEntity {
  @PrimaryColumn({ type: 'text' }) namespace!: string;
  @PrimaryColumn({ type: 'text' }) subjectType!: string;
  @PrimaryColumn({ type: 'text' }) subjectId!: string;
  @PrimaryColumn({ type: 'text' }) seriesKey!: string;
  @PrimaryColumn({ type: 'text' }) granularity!: StatGranularity;
  @PrimaryColumn({ type: 'text' }) periodStart!: string;
  @Column({ type: 'json' }) metrics!: StatMetrics;
  @Column({ type: 'text' }) updatedAt!: string;
}

import type { StatGranularity } from '@macontrol/contracts';
import { FindManyQueryBase } from '@nest-kit/sqlite';
import type { StatFilter } from '../types/stat-bucket.types';

/** Бакети серій за діапазоном. `subjectId: null` — глобальна серія (`''` у БД); `from` включно, `to` ні. */
export class FindManyMetricSnapshotsQuery extends FindManyQueryBase implements Partial<StatFilter> {
  namespace?: string;
  subjectType?: string;
  subjectId?: string | null;
  seriesKey?: string;
  granularity?: StatGranularity;
  from?: Date;
  to?: Date;
}

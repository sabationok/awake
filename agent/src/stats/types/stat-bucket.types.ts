import type { StatGranularity, StatMetrics, StatSeriesRef } from '@awake/contracts';

/** Бакет: серія × гранулярність × початок періоду, з дельтою (у пам'яті) або підсумком (у SQLite). */
export interface StatBucket extends StatSeriesRef {
  granularity: StatGranularity;
  periodStart: Date;
  metrics: StatMetrics;
}

/** Фільтр читання. Без subjectType — сума всіх subject-ів namespace (правило 8). */
export interface StatFilter {
  namespace: string;
  subjectType?: string;
  subjectId?: string | null;
  seriesKey?: string;
  granularity: StatGranularity;
  /** Включно, вирівняно на бакет. */
  from?: Date;
  /** Не включно. */
  to?: Date;
}

export interface StatIncrement extends Partial<Pick<StatSeriesRef, 'subjectType' | 'subjectId' | 'seriesKey'>> {
  namespace: string;
  /** Сирий value → сирий status → дельта; нормалізує сервіс. */
  metrics: Record<string, Record<string, number>>;
  /** Що читають графіки; за замовчуванням усі п'ять. */
  granularities?: StatGranularity[];
  at?: Date;
}

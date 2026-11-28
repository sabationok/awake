import type { StatGranularity, StatMetrics, StatSeriesRef } from '@macontrol/contracts';

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

/**
 * Замір миттєвої величини (CPU, пам'ять, навантаження): рушій лише сумує, тож у бакет іде `{ sum, n }`,
 * а середнє за бакет — `statGaugeAverage`. Одна одиниця на namespace, як і для лічильників.
 */
export interface StatGaugeSample extends Omit<StatIncrement, 'metrics'> {
  /** Назва величини → значення заміру. */
  values: Record<string, number>;
}

/** Тривалість, що тягнеться через кілька бакетів: рушій розкладає її по найдрібнішій гранулярності, status — секунди. */
export interface StatDurationIncrement extends Omit<StatIncrement, 'metrics' | 'at'> {
  value: string;
  /** За замовчуванням `seconds`. */
  status?: string;
  start: Date;
  end: Date;
}

/** Бакет таймлайну за локальним днем Mac (з годинних бакетів). */
export interface StatLocalDay {
  /** Локальна північ. */
  start: Date;
  metrics: import('@macontrol/contracts').StatMetrics;
}

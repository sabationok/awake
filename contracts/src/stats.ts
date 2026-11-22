// Статистика агента (скіл nestjs-stats): namespace + subject + value → status → число у бакетах часу (UTC).

export enum StatGranularity {
  MINUTE = 'min',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/** subjectType глобальної серії. */
export const STAT_SUBJECT_NONE = 'none';

/** status → число. */
export type StatusCounts = Record<string, number>;
/** value → status → число. */
export type StatMetrics = Record<string, StatusCounts>;

export interface StatSeriesRef {
  namespace: string;
  subjectType: string;
  /** null — глобальна серія. */
  subjectId: string | null;
  /** '' — без додаткового розрізу. */
  seriesKey: string;
}

export interface StatTimelinePoint {
  periodStart: string;
  metrics: StatMetrics;
}

export interface StatTimeline {
  namespace: string;
  granularity: StatGranularity;
  from: string;
  to: string;
  /** За сумою всіх статусів, top-N. */
  values: string[];
  statuses: string[];
  totals: StatMetrics;
  truncated: boolean;
  /** Один на кожен бакет у [from, to), порожні теж. */
  points: StatTimelinePoint[];
}

/** Сьогодні (UTC-день) / за весь час. */
export interface StatTotals {
  today: StatMetrics;
  total: StatMetrics;
}

/** Лічильники value → число (статуси складено) за сьогодні / за весь час: картки, де графік не потрібен. */
export interface StatCounters {
  today: Record<string, number>;
  total: Record<string, number>;
}

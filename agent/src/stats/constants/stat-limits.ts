import { StatGranularity } from '@awake/contracts';

/** Довжини сегментів серії: довший ключ відкидаємо на записі (правило 19). */
export const STAT_LIMITS = { namespace: 255, subjectType: 64, subjectId: 255, seriesKey: 255, value: 128, status: 64 };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ретеншен у SQLite за гранулярністю (правило 12); без запису — назавжди. */
export const STAT_RETENTION_MS: Partial<Record<StatGranularity, number>> = {
  [StatGranularity.MINUTE]: 2 * DAY_MS,
  [StatGranularity.HOUR]: 90 * DAY_MS,
};

/** Flush пам'яті в SQLite. */
export const STAT_FLUSH_MS = 60_000;
/** Прибирання старих min/hour. */
export const STAT_PRUNE_MS = 60 * 60_000;
/** Найбільше точок у timeline. */
export const STAT_MAX_TIMELINE_POINTS = 5_000;
export const STAT_DEFAULT_VALUE_LIMIT = 50;

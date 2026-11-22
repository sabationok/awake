import type { StatsPeriod } from '@awake/contracts';

/** Ключ select-а періоду на сторінці статистики модуля (`<module>.statsPeriod`). */
export const STATS_PERIOD_KEY = 'statsPeriod';
export const STATS_PERIOD_DEFAULT: StatsPeriod = 'today';

/** Періоди графіків статистики в порядку select-а. */
export const STATS_PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: 'hour', label: 'Година' },
  { value: 'today', label: 'Сьогодні' },
  { value: 'week', label: '7 днів' },
  { value: 'month', label: '30 днів' },
];

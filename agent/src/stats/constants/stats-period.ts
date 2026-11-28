import type { StatsPeriod } from '@macontrol/contracts';

/** Ключ налаштування з вибраною вкладкою періоду на сторінці статистики модуля (`<module>.statsPeriod`). */
export const STATS_PERIOD_KEY = 'statsPeriod';

/**
 * Період вкладки на сторінці статистики (спільний лейаут `buildStatsPage`): Сьогодні — години, Дні — 30 днів,
 * Тижні — 12 тижнів, Місяці — 12 місяців. Нативні графіки «Сервер» і вебхуків мають свій `StatsPeriod`.
 */
export type StatsPagePeriod = 'today' | 'days' | 'weeks' | 'months';
export const STATS_PERIOD_DEFAULT: StatsPagePeriod = 'today';

/** Вкладки періоду в порядку показу. */
export const STATS_PAGE_PERIODS: { value: StatsPagePeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: 'days', label: 'Дні' },
  { value: 'weeks', label: 'Тижні' },
  { value: 'months', label: 'Місяці' },
];

/** Будь-який період, з якого рушій будує вікно графіка. */
export type StatsChartPeriod = StatsPeriod | StatsPagePeriod;

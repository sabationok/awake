import type { SelectSetting } from '@awake/contracts';
import { STATS_PAGE_PERIODS, STATS_PERIOD_DEFAULT, STATS_PERIOD_KEY, type StatsPagePeriod } from '../constants/stats-period';

/**
 * Вибрана вкладка періоду сторінки статистики `page`: select `statsPeriod` модуля-власника. Окремим рядком не
 * показується — його пишуть вкладки періоду (`buildStatsPage`). Не `mac`: період міняє і веб.
 */
export function statsPeriodSetting(page: string, key = STATS_PERIOD_KEY): SelectSetting {
  return {
    type: 'select',
    key,
    label: 'Період',
    icon: { symbol: 'calendar', tone: 'accent' },
    page,
    default: STATS_PERIOD_DEFAULT,
    options: STATS_PAGE_PERIODS.map(({ value, label }) => ({ value, label })),
  };
}

/** Збережене значення як період вкладки; старі значення select-а («Година», «7 днів»…) — на типовий. */
export function asStatsPeriod(value: string): StatsPagePeriod {
  return STATS_PAGE_PERIODS.some((option) => option.value === value) ? (value as StatsPagePeriod) : STATS_PERIOD_DEFAULT;
}

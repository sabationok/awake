import type { SelectSetting, StatsPeriod } from '@awake/contracts';
import { STATS_PERIOD_DEFAULT, STATS_PERIOD_KEY, STATS_PERIOD_OPTIONS } from '../constants/stats-period';

/**
 * Фільтр періоду сторінки статистики: select `statsPeriod` модуля-власника, показує його сама сторінка `page`
 * (ctx.settingNode) першою секцією. Не `mac`: період міняє і веб. Зміна перебудовує дерево, як будь-яке налаштування.
 */
export function statsPeriodSetting(page: string): SelectSetting {
  return {
    type: 'select',
    key: STATS_PERIOD_KEY,
    label: 'Період',
    icon: { symbol: 'calendar', tone: 'accent' },
    page,
    default: STATS_PERIOD_DEFAULT,
    options: STATS_PERIOD_OPTIONS.map(({ value, label }) => ({ value, label })),
  };
}

/** Збережене значення select-а як `StatsPeriod` (значення вже перевірив хост). */
export function asStatsPeriod(value: string): StatsPeriod {
  return STATS_PERIOD_OPTIONS.some((option) => option.value === value) ? (value as StatsPeriod) : STATS_PERIOD_DEFAULT;
}

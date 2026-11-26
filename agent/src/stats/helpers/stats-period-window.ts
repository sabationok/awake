import { StatGranularity, type UiChart } from '@awake/contracts';
import type { StatsChartPeriod } from '../constants/stats-period';
import { statNextPeriodStart, statPeriodStart } from './stat-period';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Вікно графіків періоду: гранулярність бакетів, [from, to) і розмір бакета для осі. */
export interface StatsPeriodWindow {
  granularity: StatGranularity;
  unit: UiChart['unit'];
  from: Date;
  to: Date;
}

/** Останні `count` бакетів `granularity`, поточний включно. */
function lastBuckets(granularity: StatGranularity, unit: UiChart['unit'], count: number, now: Date): StatsPeriodWindow {
  const current = statPeriodStart(now, granularity);
  let from = current;
  for (let i = 1; i < count; i++) from = statPeriodStart(new Date(from.getTime() - 1), granularity);
  return { granularity, unit, from, to: statNextPeriodStart(current, granularity) };
}

/**
 * Година — 60 хвилинних бакетів до поточного; Сьогодні — години від локальної півночі Mac до кінця дня (майбутні
 * порожні, щоб видно весь день); 7 і 30 днів (Дні) — денні (UTC) бакети до сьогодні включно; Тижні — 12 тижнів,
 * Місяці — 12 місяців (UTC).
 */
export function statsPeriodWindow(period: StatsChartPeriod, now = new Date()): StatsPeriodWindow {
  switch (period) {
    case 'hour': {
      const current = statPeriodStart(now, StatGranularity.MINUTE);
      return { granularity: StatGranularity.MINUTE, unit: 'minute', from: new Date(current.getTime() - 59 * MIN), to: statNextPeriodStart(current, StatGranularity.MINUTE) };
    }
    case 'today': {
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { granularity: StatGranularity.HOUR, unit: 'hour', from: midnight, to: new Date(midnight.getTime() + DAY) };
    }
    case 'weeks':
      return lastBuckets(StatGranularity.WEEK, 'week', 12, now);
    case 'months':
      return lastBuckets(StatGranularity.MONTH, 'month', 12, now);
    case 'week':
    case 'month':
    case 'days': {
      const today = statPeriodStart(now, StatGranularity.DAY);
      const days = period === 'week' ? 7 : 30;
      return { granularity: StatGranularity.DAY, unit: 'day', from: new Date(today.getTime() - (days - 1) * DAY), to: new Date(today.getTime() + DAY) };
    }
  }
}

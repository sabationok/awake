import { StatGranularity, type StatsPeriod, type UiChart } from '@awake/contracts';
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

/**
 * Година — 60 хвилинних бакетів до поточного; Сьогодні — години від локальної півночі Mac до кінця дня (майбутні
 * порожні, щоб видно весь день); 7 і 30 днів — денні (UTC) бакети до сьогодні включно.
 */
export function statsPeriodWindow(period: StatsPeriod, now = new Date()): StatsPeriodWindow {
  switch (period) {
    case 'hour': {
      const current = statPeriodStart(now, StatGranularity.MINUTE);
      return { granularity: StatGranularity.MINUTE, unit: 'minute', from: new Date(current.getTime() - 59 * MIN), to: statNextPeriodStart(current, StatGranularity.MINUTE) };
    }
    case 'today': {
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { granularity: StatGranularity.HOUR, unit: 'hour', from: midnight, to: new Date(midnight.getTime() + DAY) };
    }
    case 'week':
    case 'month': {
      const today = statPeriodStart(now, StatGranularity.DAY);
      const days = period === 'week' ? 7 : 30;
      return { granularity: StatGranularity.DAY, unit: 'day', from: new Date(today.getTime() - (days - 1) * DAY), to: new Date(today.getTime() + DAY) };
    }
  }
}

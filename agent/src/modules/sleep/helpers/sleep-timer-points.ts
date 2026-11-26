import type { SleepTimerRecord, UiChartPoint } from '@awake/contracts';
import { statPeriodRange, statPeriodStart, type StatsPeriodWindow } from '../../../stats';
import { SLEEP_OUTCOME, sleepTimerOutcome } from './sleep-timer-outcome';

/** Найбільше бакетів у вікні: з запасом на 30 днів і 12 тижнів чи місяців. */
const MAX_BUCKETS = 100;

/**
 * Таймери вікна по бакетах його гранулярності, складено за наслідком (Заснув / Скасовано / Триває). Рахуються з
 * історії таймерів у SQLite: лічильників у рушії статистики в Sleeper немає.
 */
export function sleepTimerPoints(timers: SleepTimerRecord[], window: StatsPeriodWindow): UiChartPoint[] {
  const buckets = statPeriodRange(window.from, window.to, window.granularity, MAX_BUCKETS).map((start) => start.toISOString());
  const counts = new Map<string, number>();
  for (const timer of timers) {
    const at = new Date(timer.startedAt);
    if (at < window.from || at >= window.to) continue;
    const key = `${statPeriodStart(at, window.granularity).toISOString()}\u0000${sleepTimerOutcome(timer)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.flatMap((start) =>
    Object.values(SLEEP_OUTCOME).map((series) => ({ start, series, value: counts.get(`${start}\u0000${series}`) ?? 0 })),
  );
}

import type { StatMetrics } from '@macontrol/contracts';
import { STAT_GAUGE_COUNT, STAT_GAUGE_SUM } from '../constants/stat-limits';

/** Середнє заміру `value` у бакеті (`{ sum, n }` від `recordGauge`); null — у бакеті замірів не було. */
export function statGaugeAverage(metrics: StatMetrics, value: string): number | null {
  const cell = metrics[value];
  const count = cell?.[STAT_GAUGE_COUNT] ?? 0;
  return count > 0 ? (cell?.[STAT_GAUGE_SUM] ?? 0) / count : null;
}

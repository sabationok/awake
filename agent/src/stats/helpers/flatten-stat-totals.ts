import type { StatCounters, StatMetrics, StatTotals } from '@macontrol/contracts';

function flatten(metrics: StatMetrics): Record<string, number> {
  return Object.fromEntries(Object.entries(metrics).map(([value, statuses]) => [value, Object.values(statuses).reduce((a, b) => a + b, 0)]));
}

/** value → сума статусів: для карток, яким статуси не потрібні. */
export function flattenStatTotals(totals: StatTotals): StatCounters {
  return { today: flatten(totals.today), total: flatten(totals.total) };
}

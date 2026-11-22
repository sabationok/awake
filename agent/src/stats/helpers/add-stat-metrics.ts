import type { StatMetrics } from '@awake/contracts';

/** target += delta, по клітинках. Змінює target. */
export function addStatMetrics(target: StatMetrics, delta: StatMetrics): StatMetrics {
  for (const [value, statuses] of Object.entries(delta)) {
    const cell = (target[value] ??= {});
    for (const [status, count] of Object.entries(statuses)) cell[status] = (cell[status] ?? 0) + count;
  }
  return target;
}

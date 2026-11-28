import type { StatGranularity } from '@macontrol/contracts';
import { statNextPeriodStart, statPeriodStart } from './stat-period';

/** [start, end) по бакетах `granularity`: шматок на кожен бакет, щоб кожен період отримав лише свій час. */
export function splitStatSpan(start: Date, end: Date, granularity: StatGranularity): { at: Date; ms: number }[] {
  const pieces: { at: Date; ms: number }[] = [];
  for (let cur = start; cur < end; ) {
    const next = new Date(Math.min(end.getTime(), statNextPeriodStart(statPeriodStart(cur, granularity), granularity).getTime()));
    pieces.push({ at: cur, ms: next.getTime() - cur.getTime() });
    cur = next;
  }
  return pieces;
}

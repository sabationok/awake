import type { StatCounters } from '@awake/contracts';

/** Складає плоскі лічильники кількох namespace (однакові ключі сумуються, не затираються). */
export function mergeStatCounters(...parts: StatCounters[]): StatCounters {
  const out: StatCounters = { today: {}, total: {} };
  for (const part of parts) {
    for (const period of ['today', 'total'] as const) {
      for (const [key, count] of Object.entries(part[period])) out[period][key] = (out[period][key] ?? 0) + count;
    }
  }
  return out;
}

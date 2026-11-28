import type { StatePatchOp } from '@macontrol/contracts';

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Різниця двох стейтів як `set`-операції за шляхом (скіл `sdui` «State, bind, show»): обʼєкти порівнюються по
 * ключах углиб, масиви й перехід «обʼєкт ↔ null» — одним `set`. Зниклий ключ — `set` у `null`.
 */
export function diffState(prev: unknown, next: unknown, path = ''): StatePatchOp[] {
  if (isObject(prev) && isObject(next)) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    return [...keys].flatMap((key) =>
      diffState(prev[key], Object.hasOwn(next, key) ? next[key] : null, path ? `${path}.${key}` : key),
    );
  }
  if (JSON.stringify(prev) === JSON.stringify(next)) return [];
  return [{ path, value: next }];
}

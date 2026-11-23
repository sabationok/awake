import type { AppNextStep } from '@awake/contracts';
import { STEP_PATH } from './redirect-flows';
import { safeNextPath } from './safe-next';

/** Сторінка для кроку з відповіді агента. `from` — куди повернутись після входу. */
export function pathForNext(next: AppNextStep, from: string): string {
  if (next.type === 'auth') return `${STEP_PATH.login}?${new URLSearchParams({ next: safeNextPath(from) })}`;
  return STEP_PATH.pair;
}

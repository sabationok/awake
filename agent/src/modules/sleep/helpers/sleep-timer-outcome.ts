import type { SleepTimerRecord } from '@awake/contracts';
import { STOP_REASON } from '../../../mac-sessions/constants/mac-sessions';

/** Наслідок таймера сну: серія графіка і рядок підсумку. */
export const SLEEP_OUTCOME = { slept: 'Заснув', cancelled: 'Скасовано', running: 'Триває' } as const;

export function sleepTimerOutcome(timer: SleepTimerRecord): (typeof SLEEP_OUTCOME)[keyof typeof SLEEP_OUTCOME] {
  if (!timer.endedAt) return SLEEP_OUTCOME.running;
  return timer.endReason === STOP_REASON.asleep ? SLEEP_OUTCOME.slept : SLEEP_OUTCOME.cancelled;
}

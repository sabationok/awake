import { SLEEP_TIMER_MAX_MINUTES } from '../constants/sleep-timer-options';

/** Хвилини таймера з кнопки чи вибору: ціле 1…720, інакше null. */
export function parseMinutes(value: unknown): number | null {
  const minutes = Number(value);
  return Number.isInteger(minutes) && minutes > 0 && minutes <= SLEEP_TIMER_MAX_MINUTES ? minutes : null;
}

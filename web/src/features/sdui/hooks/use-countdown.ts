'use client';
import { formatRemaining } from '../lib/format-time';
import { useNow } from './use-now';

/** Залишок до ISO-часу як H:MM:SS, оновлюється щосекунди; null, якщо часу немає або він минув. */
export function useCountdown(until: string | null | undefined): string | null {
  const now = useNow();
  return until ? formatRemaining(until, now) : null;
}

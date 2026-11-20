import type { SessionRecord } from '@awake/contracts';
import { sessionDurationMs } from './session-duration-ms';

export interface SessionsSummary {
  count: number;
  totalMs: number;
  /** null, якщо сесій немає: середнє від нуля не має сенсу. */
  averageMs: number | null;
}

/** Сесії, що почалися не раніше sinceMs: кількість, сумарна і середня тривалість. */
export function summarizeSessions(sessions: SessionRecord[], sinceMs: number, nowMs: number): SessionsSummary {
  const recent = sessions.filter((session) => new Date(session.startedAt).getTime() >= sinceMs);
  const totalMs = recent.reduce((sum, session) => sum + sessionDurationMs(session, nowMs), 0);
  return {
    count: recent.length,
    totalMs,
    averageMs: recent.length > 0 ? totalMs / recent.length : null,
  };
}

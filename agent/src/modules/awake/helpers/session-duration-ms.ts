import type { SessionRecord } from '@awake/contracts';

/** Тривалість сесії в мс; відкрита сесія рахується до nowMs. */
export function sessionDurationMs(session: SessionRecord, nowMs: number): number {
  const endMs = session.endedAt ? new Date(session.endedAt).getTime() : nowMs;
  return Math.max(0, endMs - new Date(session.startedAt).getTime());
}

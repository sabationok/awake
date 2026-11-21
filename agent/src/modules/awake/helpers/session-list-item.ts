import type { SessionRecord, UiList } from '@awake/contracts';
import { formatElapsed } from '../../helpers/format-elapsed';
import { formatSessionStart } from '../../helpers/format-session-start';
import { sessionSourceLabel } from '../../helpers/session-source-label';

/** Рядок історії сесій: початок, джерело, тривалість і причина завершення. */
export function sessionListItem(session: SessionRecord, now: Date): UiList['items'][number] {
  const parts = [
    sessionSourceLabel(session.source),
    session.duration,
    session.endReason ?? (session.endedAt ? null : 'триває'),
  ];
  return {
    id: String(session.id),
    label: formatSessionStart(session.startedAt),
    hint: parts.filter((part): part is string => part !== null).join(' · '),
    value: formatElapsed(session.startedAt, session.endedAt ?? now.toISOString()),
  };
}

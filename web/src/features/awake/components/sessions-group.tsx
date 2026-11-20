import type { SessionRecord } from '@awake/contracts';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { SOURCE_LABEL } from '../awake.constants';
import { formatDateTime, formatSpan } from '../lib/format-time';

/** Останні сесії з SQLite агента: коли, скільки, хто почав і чим скінчилась. */
export function SessionsGroup({ sessions, now }: { sessions: SessionRecord[]; now: number }) {
  return (
    <Group title="Сесії">
      {sessions.length === 0 && <KeyValueRow label={<span className="text-secondary">Ще не було жодної сесії</span>} />}
      {sessions.map((session) => (
        <KeyValueRow
          key={session.id}
          label={formatDateTime(session.startedAt)}
          hint={[SOURCE_LABEL[session.source], session.duration, session.endReason ?? (session.endedAt ? null : 'триває')]
            .filter(Boolean)
            .join(' · ')}
          value={formatSpan(session.startedAt, session.endedAt, now)}
        />
      ))}
    </Group>
  );
}

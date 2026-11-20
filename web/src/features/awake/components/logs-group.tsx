import type { LogRecord } from '@awake/contracts';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { formatClock } from '../lib/format-time';

/** Хвіст журналу Mac-аппки, найновіші зверху. */
export function LogsGroup({ logs }: { logs: LogRecord[] }) {
  if (logs.length === 0) return null;
  return (
    <Group title="Журнал">
      {logs.map((log) => (
        <KeyValueRow key={log.id} label={<span className="text-[13px]">{log.text}</span>} value={formatClock(log.at)} />
      ))}
    </Group>
  );
}

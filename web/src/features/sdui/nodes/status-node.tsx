import type { UiStatus } from '@awake/contracts';
import { FlexRow } from '@/components/flex';
import { KeyValueRow } from '@/components/key-value-row';
import { StatusDot } from '@/components/status-dot';
import { useNow } from '../hooks/use-now';
import { formatRemaining } from '../lib/format-time';
import type { NodeProps } from '../sdui.types';
import { SduiIcon } from './sdui-icon';

/** Головний рядок стану: крапка і великий текст або відлік до countdownTo. */
export function StatusNode({ node }: NodeProps<UiStatus>) {
  return (
    <KeyValueRow
      icon={<SduiIcon icon={node.icon} />}
      label={node.label}
      hint={node.hint}
      value={
        <FlexRow gap="sm">
          <StatusDot tone={node.tone} pulse={node.pulse} />
          <span className="text-[17px] font-semibold text-label">
            {node.countdownTo ? <Countdown until={node.countdownTo} /> : (node.value ?? '—')}
          </span>
        </FlexRow>
      }
    />
  );
}

function Countdown({ until }: { until: string }) {
  const now = useNow();
  return formatRemaining(until, now) ?? '—';
}

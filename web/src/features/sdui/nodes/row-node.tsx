import type { UiRow } from '@awake/contracts';
import { FlexRow } from '@/components/flex';
import { KeyValueRow } from '@/components/key-value-row';
import { StatusDot } from '@/components/status-dot';
import { useCountdown } from '../hooks/use-countdown';
import type { NodeProps } from '../sdui.types';
import { ControlView } from './control-view';
import { SduiIcon } from './sdui-icon';

/** Рядок «назва — значення» або «назва — керування», з іконкою, крапкою стану і відліком. */
export function RowNode({ node, onEvent }: NodeProps<UiRow>) {
  const hasHint = Boolean(node.hint || node.dot || node.countdownTo);
  return (
    <KeyValueRow
      icon={<SduiIcon icon={node.icon} large={node.prominent} />}
      label={node.label}
      prominent={node.prominent}
      hint={hasHint ? <RowHint node={node} /> : undefined}
      value={node.control ? <ControlView control={node.control} label={node.label} onEvent={onEvent} /> : node.value}
    />
  );
}

function RowHint({ node }: { node: UiRow }) {
  const countdown = useCountdown(node.countdownTo);
  return (
    <FlexRow gap="xs" className="min-w-0">
      {node.dot && <StatusDot tone={node.dot.tone} pulse={node.dot.pulse} />}
      {node.hint && <span>{node.hint}</span>}
      {countdown && <span className="shrink-0 tabular-nums">{countdown}</span>}
    </FlexRow>
  );
}

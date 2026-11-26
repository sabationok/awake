import type { UiSection } from '@awake/contracts';
import { FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { StatusBadge } from '@/components/status-badge';
import { useEventScope } from '../hooks/use-event-scope';
import type { NodeProps } from '../sdui.types';
import { ActionSet } from './action-set';
import { NodeView } from './node-view';

/** Секція: Group з дітей; стан і дії секції — праворуч від заголовка; помилка її дій з'являється в підписі. */
export function SectionNode({ node, onEvent }: NodeProps<UiSection>) {
  const scope = useEventScope(onEvent);
  const footer =
    node.footer || scope.error ? (
      <>
        {node.footer}
        {scope.error && <span className="block text-red">{scope.error}</span>}
      </>
    ) : undefined;

  const hasTrailing = Boolean(node.status || (node.actions && node.actions.length > 0));
  const trailing = hasTrailing ? (
    <FlexRow gap="sm">
      {node.status && <StatusBadge label={node.status.label} tone={node.status.tone} pulse={node.status.pulse} />}
      {node.actions && <ActionSet items={node.actions} onEvent={scope.run} />}
    </FlexRow>
  ) : undefined;

  return (
    <Group title={node.title} footer={footer} trailing={trailing}>
      {node.children.map((child) => (
        <NodeView key={child.id} node={child} onEvent={scope.run} />
      ))}
    </Group>
  );
}

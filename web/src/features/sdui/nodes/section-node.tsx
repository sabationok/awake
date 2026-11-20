import type { UiSection } from '@awake/contracts';
import { Group } from '@/components/group';
import { useEventScope } from '../hooks/use-event-scope';
import type { NodeProps } from '../sdui.types';
import { NodeView } from './node-view';

/** Секція: Group з дітей; помилка її дій з'являється в підписі. */
export function SectionNode({ node, onEvent }: NodeProps<UiSection>) {
  const scope = useEventScope(onEvent);
  const footer =
    node.footer || scope.error ? (
      <>
        {node.footer}
        {scope.error && <span className="block text-red">{scope.error}</span>}
      </>
    ) : undefined;

  return (
    <Group title={node.title} footer={footer}>
      {node.children.map((child) => (
        <NodeView key={child.id} node={child} onEvent={scope.run} />
      ))}
    </Group>
  );
}

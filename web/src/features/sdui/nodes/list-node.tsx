import type { UiList } from '@awake/contracts';
import { KeyValueRow } from '@/components/key-value-row';
import type { NodeProps } from '../sdui.types';

/** Записи списку: назва, підказка і значення праворуч; порожній стан — текстом. */
export function ListNode({ node }: NodeProps<UiList>) {
  if (node.items.length === 0) {
    return node.empty ? <KeyValueRow label={<span className="text-secondary">{node.empty}</span>} /> : null;
  }
  return (
    <>
      {node.items.map((item) => (
        <KeyValueRow key={item.id} label={item.label} hint={item.hint} value={item.value} />
      ))}
    </>
  );
}

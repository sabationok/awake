import type { UiRow } from '@awake/contracts';
import { KeyValueRow } from '@/components/key-value-row';
import type { NodeProps } from '../sdui.types';
import { SduiIcon } from './sdui-icon';

/** Рядок «назва — значення» з іконкою. */
export function RowNode({ node }: NodeProps<UiRow>) {
  return <KeyValueRow icon={<SduiIcon icon={node.icon} />} label={node.label} hint={node.hint} value={node.value} />;
}

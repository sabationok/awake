import type { UiSelect } from '@awake/contracts';
import { KeyValueRow } from '@/components/key-value-row';
import { Select } from '@/components/select';
import { useBusyEvent } from '../hooks/use-busy-event';
import type { NodeProps } from '../sdui.types';
import { SduiIcon } from './sdui-icon';

/** Випадний список налаштування модуля: вибір іде як setting з module і key. */
export function SelectNode({ node, onEvent }: NodeProps<UiSelect>) {
  const { send, busy } = useBusyEvent(onEvent);
  return (
    <KeyValueRow
      icon={<SduiIcon icon={node.icon} />}
      label={node.label}
      hint={node.hint}
      value={
        <Select
          aria-label={node.label}
          value={node.value}
          disabled={node.disabled || busy}
          onChange={(e) => send({ type: 'setting', change: { module: node.module, key: node.key, value: e.target.value } })}
        >
          {node.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      }
    />
  );
}

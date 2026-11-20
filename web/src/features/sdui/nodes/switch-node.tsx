import type { UiSwitch } from '@awake/contracts';
import { KeyValueRow } from '@/components/key-value-row';
import { Switch } from '@/components/switch';
import { useBusyEvent } from '../hooks/use-busy-event';
import type { NodeProps } from '../sdui.types';
import { SduiIcon } from './sdui-icon';

/** Перемикач налаштування модуля: зміна йде як setting з module і key. */
export function SwitchNode({ node, onEvent }: NodeProps<UiSwitch>) {
  const { send, busy } = useBusyEvent(onEvent);
  return (
    <KeyValueRow
      icon={<SduiIcon icon={node.icon} />}
      label={node.label}
      hint={node.hint}
      value={
        <Switch
          aria-label={node.label}
          checked={node.value}
          disabled={node.disabled || busy}
          onCheckedChange={(value) => send({ type: 'setting', change: { module: node.module, key: node.key, value } })}
        />
      }
    />
  );
}

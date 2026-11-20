import { Loader2 } from 'lucide-react';
import type { UiButton, UiControl } from '@awake/contracts';
import { Button } from '@/components/button';
import { Select } from '@/components/select';
import { Switch } from '@/components/switch';
import { useBusyEvent } from '../hooks/use-busy-event';
import type { SduiEventHandler } from '../sdui.types';

/** Керувальний елемент праворуч у рядку: перемикач, вибір або кнопка. Блокується, поки подія летить. */
export function ControlView({ control, label, onEvent }: { control: UiControl; label: string; onEvent: SduiEventHandler }) {
  switch (control.type) {
    case 'switch':
      return <SwitchControl control={control} label={label} onEvent={onEvent} />;
    case 'select':
      return <SelectControl control={control} label={label} onEvent={onEvent} />;
    case 'button':
      return <ButtonControl button={control.button} onEvent={onEvent} />;
  }
}

type SwitchUi = Extract<UiControl, { type: 'switch' }>;
type SelectUi = Extract<UiControl, { type: 'select' }>;

/** Без setting перемикач викликає on / off; з setting пише налаштування модуля. */
function SwitchControl({ control, label, onEvent }: { control: SwitchUi; label: string; onEvent: SduiEventHandler }) {
  const { send, busy } = useBusyEvent(onEvent);
  const change = (value: boolean) => {
    if (control.setting) {
      void send({ type: 'setting', change: { module: control.setting.module, key: control.setting.key, value } });
      return;
    }
    const action = value ? control.on : control.off;
    if (action) void send({ type: 'action', action });
  };
  return <Switch aria-label={label} checked={control.value} disabled={control.disabled || busy} onCheckedChange={change} />;
}

function SelectControl({ control, label, onEvent }: { control: SelectUi; label: string; onEvent: SduiEventHandler }) {
  const { send, busy } = useBusyEvent(onEvent);
  return (
    <Select
      aria-label={label}
      value={control.value}
      disabled={control.disabled || busy}
      onChange={(e) => void send({ type: 'setting', change: { module: control.setting.module, key: control.setting.key, value: e.target.value } })}
    >
      {control.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

function ButtonControl({ button, onEvent }: { button: UiButton; onEvent: SduiEventHandler }) {
  const { send, busy } = useBusyEvent(onEvent);
  const press = () => {
    if (button.confirm && !window.confirm(button.confirm)) return;
    void send({ type: 'action', action: button.action });
  };
  return (
    <Button variant={button.variant} disabled={button.disabled || busy} onClick={press} className="h-8 px-3 text-[13px]">
      {busy ? <Loader2 size={14} className="animate-spin" /> : button.label}
    </Button>
  );
}

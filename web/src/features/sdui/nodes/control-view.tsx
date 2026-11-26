import { Loader2 } from 'lucide-react';
import type { UiButton, UiControl, UiEvent } from '@awake/contracts';
import { useState } from 'react';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Select } from '@/components/select';
import { Slider } from '@/components/slider';
import { Switch } from '@/components/switch';
import { useBusyEvent } from '../hooks/use-busy-event';
import type { SduiEventHandler } from '../sdui.types';

/** Керувальний елемент праворуч у рядку: перемикач, вибір, повзунок або кнопка. Блокується, поки подія летить. */
export function ControlView({ control, label, onEvent }: { control: UiControl; label: string; onEvent: SduiEventHandler }) {
  switch (control.type) {
    case 'switch':
      return <SwitchControl control={control} label={label} onEvent={onEvent} />;
    case 'select':
      return <SelectControl control={control} label={label} onEvent={onEvent} />;
    case 'slider':
      return <SliderControl control={control} label={label} onEvent={onEvent} />;
    case 'button':
      return <ButtonControl button={control.button} onEvent={onEvent} />;
  }
}

type SwitchUi = Extract<UiControl, { type: 'switch' }>;
type SelectUi = Extract<UiControl, { type: 'select' }>;
type SliderUi = Extract<UiControl, { type: 'slider' }>;

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
      onChange={(e) => {
        const event = selectEvent(control, e.target.value);
        if (event) void send(event);
      }}
    >
      {control.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

/** Вибір пише налаштування або, без нього, викликає дію з вибраним значенням. */
function selectEvent(control: SelectUi, value: string): UiEvent | null {
  if (control.setting) return { type: 'setting', change: { module: control.setting.module, key: control.setting.key, value } };
  if (!control.action) return null;
  return { type: 'action', action: { ...control.action, params: { ...control.action.params, value } } };
}

function SliderControl({ control, label, onEvent }: { control: SliderUi; label: string; onEvent: SduiEventHandler }) {
  const { send, busy } = useBusyEvent(onEvent);
  const commit = (value: number) =>
    void send({ type: 'action', action: { ...control.action, params: { ...control.action.params, value } } });
  return (
    <Slider
      aria-label={label}
      value={control.value}
      min={control.min}
      max={control.max}
      step={control.step}
      disabled={control.disabled || busy}
      onCommit={commit}
    />
  );
}

function ButtonControl({ button, onEvent }: { button: UiButton; onEvent: SduiEventHandler }) {
  const { send, busy } = useBusyEvent(onEvent);
  const [confirming, setConfirming] = useState(false);
  const fire = () => void send({ type: 'action', action: button.action });
  return (
    <>
      <Button
        variant={button.variant}
        disabled={button.disabled || busy}
        onClick={() => (button.confirm ? setConfirming(true) : fire())}
        className="h-8 px-3 text-[13px]"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : button.label}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={button.confirm ?? ''}
        text=""
        ok={button.label}
        danger={button.variant === 'destructive'}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          fire();
        }}
      />
    </>
  );
}

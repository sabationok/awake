import type { MacState } from '@awake/contracts';
import { BatteryMedium, Coffee, Laptop, Moon, Plug, Thermometer, Wifi } from 'lucide-react';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { StatusDot } from '@/components/status-dot';
import { SymbolIcon } from '@/components/symbol-icon';
import { FlexRow } from '@/components/flex';
import { POWER_LABEL, THERMAL_LABEL } from '../awake.constants';
import { formatAgo, formatClock, formatRemaining } from '../lib/format-time';

interface MacStatusGroupProps {
  state: MacState | null;
  /** Коли стан оновився востаннє; для віддаленого режиму, де Mac може бути офлайн. */
  updatedAt?: string | null;
  now: number;
}

/** Сесія і стан Mac: що зараз відбувається і скільки лишилось. */
export function MacStatusGroup({ state, updatedAt, now }: MacStatusGroupProps) {
  if (!state) {
    return (
      <Group footer="Mac вимкнений, спить або Awake не запущений. Стан оновиться, щойно він з'явиться в мережі.">
        <KeyValueRow
          icon={<SymbolIcon tone="gray"><Moon size={16} /></SymbolIcon>}
          label="Mac офлайн"
          value={<FlexRow gap="sm"><StatusDot tone="gray" />{updatedAt ? formatAgo(updatedAt, now) : 'немає даних'}</FlexRow>}
        />
      </Group>
    );
  }

  const remaining = state.active ? formatRemaining(state.until, now) : null;
  const thermal = THERMAL_LABEL[state.thermal];

  return (
    <>
      <Group footer={updatedAt ? `${state.host} · оновлено ${formatAgo(updatedAt, now)}` : state.host}>
        <KeyValueRow
          icon={<SymbolIcon tone={state.active ? 'orange' : 'gray'}><Coffee size={16} /></SymbolIcon>}
          label={state.active ? 'Не спить' : 'Сесія не активна'}
          hint={state.active && state.until ? `до ${formatClock(state.until)}${state.duration ? ` · ${state.duration}` : ''}` : undefined}
          value={
            <FlexRow gap="sm">
              <StatusDot tone={state.active ? 'green' : 'gray'} pulse={state.active} />
              <span className="text-[17px] font-semibold text-label">{remaining ?? '—'}</span>
            </FlexRow>
          }
        />
        {!state.active && state.sleepBlocked && (
          <KeyValueRow icon={<SymbolIcon tone="red"><Moon size={16} /></SymbolIcon>} label="Сон заблокований поза сесією" />
        )}
      </Group>

      <Group title="Стан">
        <KeyValueRow
          icon={<SymbolIcon tone="green"><BatteryMedium size={16} /></SymbolIcon>}
          label="Батарея"
          value={state.battery === null ? '—' : `${state.battery}%`}
        />
        <KeyValueRow icon={<SymbolIcon tone="accent"><Plug size={16} /></SymbolIcon>} label="Живлення" value={POWER_LABEL[state.power]} />
        <KeyValueRow icon={<SymbolIcon tone={thermal.tone}><Thermometer size={16} /></SymbolIcon>} label="Температура" value={thermal.label} />
        <KeyValueRow
          icon={<SymbolIcon tone="gray"><Laptop size={16} /></SymbolIcon>}
          label="Кришка"
          value={state.lidClosed ? 'Закрита' : 'Відкрита'}
        />
        <KeyValueRow
          icon={<SymbolIcon tone="accent"><Wifi size={16} /></SymbolIcon>}
          label="Мережа"
          value={state.ssid ? `${state.ssid}${state.trusted ? ' · довірена' : ''}` : '—'}
        />
      </Group>
    </>
  );
}

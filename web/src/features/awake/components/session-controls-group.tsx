'use client';
import { useState } from 'react';
import type { CommandRequest } from '@awake/contracts';
import { Button } from '@/components/button';
import { FlexBox, FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { START_PRESETS } from '../awake.constants';

interface SessionControlsGroupProps {
  active: boolean;
  disabled?: boolean;
  onCommand: (command: CommandRequest) => Promise<void>;
}

/** Старт на 1/2/4 год (під час сесії — перезапуск), стоп, блокування і екран. */
export function SessionControlsGroup({ active, disabled = false, onCommand }: SessionControlsGroupProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (command: CommandRequest) => {
    setBusy(true);
    setError(null);
    try {
      await onCommand(command);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const locked = disabled || busy;

  return (
    <Group
      title="Керування"
      footer={error ?? (active ? 'Нова тривалість перезапускає сесію з нуля.' : 'Mac не спатиме обраний час, навіть із закритою кришкою.')}
    >
      <FlexBox gap="md" className="p-4">
        <FlexRow gap="sm" className="[&>*]:flex-1">
          {START_PRESETS.map((preset) => (
            <Button key={preset.duration} variant="filled" disabled={locked} onClick={() => run({ action: 'start', duration: preset.duration })}>
              {preset.label}
            </Button>
          ))}
        </FlexRow>
        <FlexRow gap="sm" className="[&>*]:flex-1">
          <Button variant="destructive" disabled={locked || !active} onClick={() => run({ action: 'stop' })}>
            Стоп
          </Button>
          <Button disabled={locked} onClick={() => run({ action: 'lock' })}>
            Заблокувати
          </Button>
          <Button disabled={locked} onClick={() => run({ action: 'displayOff' })}>
            Екран
          </Button>
        </FlexRow>
      </FlexBox>
    </Group>
  );
}

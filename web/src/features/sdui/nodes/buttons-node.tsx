import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UiButton, UiButtons } from '@awake/contracts';
import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FlexRow } from '@/components/flex';
import type { NodeProps } from '../sdui.types';

/** Ряд кнопок однакової ширини; поки одна летить, решта заблоковані. */
export function ButtonsNode({ node, onEvent }: NodeProps<UiButtons>) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<UiButton | null>(null);

  const press = (button: UiButton) => {
    if (button.confirm) setConfirming(button);
    else void send(button);
  };

  const send = async (button: UiButton) => {
    setPendingId(button.id);
    try {
      await onEvent({ type: 'action', action: button.action });
    } catch {
      // Помилку показує підпис секції.
    } finally {
      setPendingId(null);
    }
  };

  return (
    <FlexRow gap="sm" className="px-4 py-2.5">
      {node.buttons.map((button) => (
        <Button
          key={button.id}
          variant={button.variant}
          disabled={button.disabled || pendingId !== null}
          onClick={() => press(button)}
          className="flex-1"
        >
          {pendingId === button.id ? <Loader2 size={16} className="animate-spin" /> : button.label}
        </Button>
      ))}
      <ConfirmDialog
        open={confirming !== null}
        title={confirming?.confirm ?? ''}
        text=""
        ok={confirming?.label ?? ''}
        danger={confirming?.variant === 'destructive'}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void send(confirming);
          setConfirming(null);
        }}
      />
    </FlexRow>
  );
}

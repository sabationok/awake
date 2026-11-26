import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { UiButton, UiButtons } from '@awake/contracts';
import { Button } from '@/components/button';
import { FlexRow } from '@/components/flex';
import type { NodeProps } from '../sdui.types';

/** Ряд кнопок однакової ширини; поки одна летить, решта заблоковані. */
export function ButtonsNode({ node, onEvent }: NodeProps<UiButtons>) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const press = async (button: UiButton) => {
    if (button.confirm && !window.confirm(button.confirm)) return;
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
    </FlexRow>
  );
}

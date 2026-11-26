'use client';
import { useCallback, useState } from 'react';
import type { UiEvent } from '@awake/contracts';
import type { SduiEventHandler } from '../sdui.types';

/** Прапорець «подія летить»: контрол блокується, поки сервер не відповів. `send` не кидає: повертає текст помилки або null. */
export function useBusyEvent(onEvent: SduiEventHandler) {
  const [busy, setBusy] = useState(false);
  const send = useCallback(
    async (event: UiEvent): Promise<string | null> => {
      setBusy(true);
      try {
        await onEvent(event);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Не вдалося виконати дію';
      } finally {
        setBusy(false);
      }
    },
    [onEvent],
  );
  return { send, busy };
}

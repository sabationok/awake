'use client';
import { useCallback, useState } from 'react';
import type { UiEvent } from '@awake/contracts';
import type { SduiEventHandler } from '../sdui.types';

/** Прапорець «подія летить»: контрол блокується, поки сервер не відповів. */
export function useBusyEvent(onEvent: SduiEventHandler) {
  const [busy, setBusy] = useState(false);
  const send = useCallback(
    async (event: UiEvent) => {
      setBusy(true);
      try {
        await onEvent(event);
      } finally {
        setBusy(false);
      }
    },
    [onEvent],
  );
  return { send, busy };
}

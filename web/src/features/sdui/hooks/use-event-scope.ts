'use client';
import { useCallback, useState } from 'react';
import type { UiEvent } from '@awake/contracts';
import type { SduiEventHandler } from '../sdui.types';

/**
 * Зона помилок секції: відхилена дія з'являється в підписі секції і йде далі вгору, щоб форма, що її викликала,
 * лишилась відкритою з помилкою. Ловить остаточно `useBusyEvent` у листовому контролі.
 */
export function useEventScope(onEvent: SduiEventHandler) {
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (event: UiEvent) => {
      setError(null);
      try {
        await onEvent(event);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не вдалося виконати дію');
        throw e;
      }
    },
    [onEvent],
  );
  return { run, error };
}

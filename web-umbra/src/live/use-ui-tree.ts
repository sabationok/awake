'use client';
import type { UiEvent, UiTree } from '@awake/contracts';
import { useCallback } from 'react';
import type { UiSource } from './sources';
import { usePolling } from './use-polling';

const POLL_MS = 2000;

/**
 * Дерево з агента раз на 2 с, поки вкладка видима. Після події одразу перечитує його, і `send` завершується лише
 * тоді: контрол тримає лоадер, поки не прийде нове значення з сервера. Помилку сервера `send` кидає далі.
 */
export function useUiTree(source: UiSource) {
  const { data, error, status, loaded, refresh } = usePolling<UiTree | null>(() => source.load(), POLL_MS, null);
  const send = useCallback(
    async (event: UiEvent) => {
      try {
        await source.send(event);
      } finally {
        await refresh();
      }
    },
    [source, refresh],
  );
  return { tree: data, error, unauthorized: status === 401, loaded, send };
}

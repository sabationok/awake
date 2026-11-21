'use client';
import { useCallback, useMemo } from 'react';
import type { UiEvent } from '@awake/contracts';
import { toReadOnlyNodes } from '../lib/to-read-only-nodes';
import { hybridSource, type HybridSnapshot } from '../sources/hybrid-source';
import { usePolling } from './use-polling';
import { useRelay } from './use-relay';

const INITIAL: HybridSnapshot = { tree: null, mode: 'readonly', directError: false };

/**
 * Дерево з Mac: напряму в тій самій мережі, інакше через relay webhooxy, інакше лише перегляд з Upstash.
 * Керування є в режимах direct і relay.
 */
export function useHybridTree() {
  const { data, refresh } = usePolling(() => hybridSource.load(), 2000, INITIAL);
  const relay = useRelay();
  const directSend = data.send;
  const relayReady = !directSend && relay.status === 'online' && relay.tree !== null;
  const relaySend = relay.send;

  const send = useCallback(
    async (event: UiEvent) => {
      if (directSend) {
        await directSend(event);
        await refresh();
      } else if (relayReady) {
        // Нове дерево агент розішле сам після події.
        await relaySend(event);
      }
    },
    [directSend, relayReady, relaySend, refresh],
  );

  const source = relayReady ? relay.tree : data.tree;
  const canSend = !!directSend || relayReady;
  const tree = useMemo(
    () =>
      source && !canSend
        ? { ...source, pages: source.pages.map((page) => ({ ...page, children: toReadOnlyNodes(page.children) })) }
        : source,
    [source, canSend],
  );

  return {
    tree,
    send: canSend ? send : undefined,
    mode: relayReady ? ('relay' as const) : data.mode,
    directError: data.directError,
    relayStatus: relay.status,
  };
}

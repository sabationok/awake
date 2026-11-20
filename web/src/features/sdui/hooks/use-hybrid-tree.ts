'use client';
import { useCallback, useMemo } from 'react';
import type { UiEvent } from '@awake/contracts';
import { toReadOnlyNodes } from '../lib/to-read-only-nodes';
import { hybridSource, type HybridSnapshot } from '../sources/hybrid-source';
import { usePolling } from './use-polling';

const INITIAL: HybridSnapshot = { tree: null, mode: 'readonly', directError: false };

/** Дерево з Upstash або напряму з Mac; керування доступне лише в режимі direct. */
export function useHybridTree() {
  const { data, refresh } = usePolling(() => hybridSource.load(), 2000, INITIAL);
  const directSend = data.send;

  const send = useCallback(
    async (event: UiEvent) => {
      if (!directSend) return;
      await directSend(event);
      await refresh();
    },
    [directSend, refresh],
  );

  const tree = useMemo(
    () =>
      data.tree && !directSend
        ? { ...data.tree, pages: data.tree.pages.map((page) => ({ ...page, children: toReadOnlyNodes(page.children) })) }
        : data.tree,
    [data.tree, directSend],
  );

  return { tree, send: directSend ? send : undefined, mode: data.mode, directError: data.directError };
}

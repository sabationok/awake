'use client';
import { useCallback, useMemo } from 'react';
import type { UiEvent, UiTree } from '@awake/contracts';
import { toReadOnlyNodes } from '../lib/to-read-only-nodes';
import type { UiSource } from '../sources/ui-source';
import { usePolling } from './use-polling';

/** Опитує дерево з джерела; після події одразу перечитує його. Джерело без send дає дерево лише для перегляду. */
export function useUiTree(source: UiSource) {
  const { data, error, refresh } = usePolling<UiTree | null>(() => source.load(), 2000, null);
  const readOnly = !source.send;
  const tree = useMemo(
    () => (data && readOnly ? { ...data, pages: data.pages.map((page) => ({ ...page, children: toReadOnlyNodes(page.children) })) } : data),
    [data, readOnly],
  );
  const send = useCallback(
    async (event: UiEvent) => {
      if (!source.send) return;
      await source.send(event);
      await refresh();
    },
    [source, refresh],
  );
  return { tree, error, send, readOnly };
}

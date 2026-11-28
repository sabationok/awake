'use client';
import type { UiEvent, UiPageLayout, UiShell } from '@macontrol/contracts';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { PageStore } from '@/sdui/page-layout';
import type { UiSource } from './sources';
import { usePolling } from './use-polling';

/** Скільки відкритих сторінок тримаємо: перехід назад на них не чекає мережі, `rev` звіряється у фоні. */
const CACHED_PAGES = 8;

/**
 * Індекс роутів і сторінка на екрані з джерела раз на `intervalMs`, поки вкладка видима. Кожен запит з ETag:
 * незмінне повертає `304` і не перемальовується. Інші сторінки не тягнемо. Після події одразу перечитує індекс і
 * сторінку, і `send` завершується лише тоді: контрол тримає лоадер до нового значення. Помилку сервера `send` кидає далі.
 */
export function useUiLayout(source: UiSource, intervalMs: number) {
  const [shell, setShell] = useState<UiShell | null>(null);
  const [pages, setPages] = useState<ReadonlyMap<string, UiPageLayout | null>>(new Map());
  const tags = useRef(new Map<string, string | null>());
  const current = useRef<string | null>(null);

  const loadPage = useCallback(
    async (pageId: string) => {
      const result = await source.page(pageId, tags.current.get(pageId) ?? null);
      if (result === null) return;
      tags.current.delete(pageId);
      tags.current.set(pageId, result?.tag ?? null);
      setPages((prev) => {
        const next = new Map(prev);
        next.delete(pageId);
        next.set(pageId, result?.data ?? null);
        for (const id of next.keys()) {
          if (next.size <= CACHED_PAGES) break;
          next.delete(id);
          tags.current.delete(id);
        }
        return next;
      });
    },
    [source],
  );

  const load = useCallback(async () => {
    const result = await source.shell(tags.current.get('') ?? null);
    if (result) {
      tags.current.set('', result.tag);
      // Джерело тимчасово без індексу (Vercel): лишаємо останній отриманий.
      setShell((prev) => result.data ?? prev);
    }
    if (current.current) await loadPage(current.current);
  }, [source, loadPage]);

  const { error, status, loaded, refresh } = usePolling(load, intervalMs, undefined);

  const open = useCallback(
    (pageId: string) => {
      if (current.current === pageId) return;
      current.current = pageId;
      loadPage(pageId).catch(() => undefined);
    },
    [loadPage],
  );
  const store = useMemo<PageStore>(() => ({ get: (pageId) => pages.get(pageId), open }), [pages, open]);

  const send = useCallback(
    async (event: UiEvent) => {
      try {
        await source.send?.(event);
      } finally {
        await refresh();
      }
    },
    [source, refresh],
  );

  return { shell, pages: store, error, unauthorized: status === 401, loaded, send };
}

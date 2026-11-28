'use client';
import { useEffect, useMemo } from 'react';
import { AppStateStore } from '@/sdui/app-state-store';
import type { UiSource } from './sources';

/** Пауза перед повторним підключенням: росте до максимуму, поки канал падає, і скидається після повідомлення. */
const RETRY_MS = 1000;
const RETRY_MAX_MS = 15_000;

/**
 * Копія AppState з живого каналу джерела (`source.live`): підключення, повний стейт, патчі з `rev`, тости. Пропуск
 * `rev` або обрив — нове підключення, яке знову дає повний стейт. Джерело без каналу — стор лишається порожнім і
 * вузли малюються як прийшли.
 */
export function useLiveState(source: UiSource | null): AppStateStore {
  const store = useMemo(() => new AppStateStore(), [source]);
  useEffect(() => {
    const live = source?.live;
    if (!live) return;
    const controller = new AbortController();
    let delay = RETRY_MS;
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          await live((message) => {
            delay = RETRY_MS;
            return store.apply(message);
          }, controller.signal);
        } catch {
          // Обрив, 401 чи сервер недоступний: про це вже каже опитування індексу; тут лише пробуємо знову.
        }
        if (controller.signal.aborted) return;
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, RETRY_MAX_MS);
      }
    })();
    return () => controller.abort();
  }, [source, store]);
  return store;
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Повторює запит з інтервалом, поки вкладка видима. Без кешу і бібліотек:
 * одне джерело даних на сторінку, нічого спільного між запитами.
 */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, refresh]);

  return { data, error, refresh };
}

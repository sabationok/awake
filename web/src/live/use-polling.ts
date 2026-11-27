'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Повторює запит з інтервалом, поки вкладка видима (як у web). Без кешу і бібліотек: одне джерело даних на сторінку.
 * `status` — HTTP-статус останньої помилки (401 — сервер живий, але не впізнав пристрій).
 * `loaded` — чи була вже хоч одна відповідь (успіх чи помилка), щоб до неї показувати завантаження, а не «офлайн».
 */
export function usePolling<T>(load: () => Promise<T>, intervalMs: number, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const loadRef = useRef(load);
  loadRef.current = load;

  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
      setStatus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus((e as { status?: number }).status ?? null);
    } finally {
      setLoaded(true);
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

  return { data, error, status, loaded, refresh };
}

'use client';
import { useEffect, useState } from 'react';

/** Поточний час, що оновлюється раз на секунду: для зворотного відліку. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

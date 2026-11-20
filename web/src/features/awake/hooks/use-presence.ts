'use client';
import type { Presence } from '@awake/contracts';
import { usePolling } from './use-polling';

async function loadPresence(): Promise<Presence | null> {
  const res = await fetch('/api/presence', { cache: 'no-store' });
  if (res.status === 401) {
    location.assign('/login');
    return null;
  }
  if (!res.ok) throw new Error(`presence ${res.status}`);
  return (await res.json()) as Presence | null;
}

/** Стан Mac з Upstash через сервер Vercel; початкове значення приходить із серверного рендеру. */
export function usePresence(initial: Presence | null) {
  return usePolling(loadPresence, 3000, initial);
}

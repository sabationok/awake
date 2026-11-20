'use client';
import type { Presence } from '@awake/contracts';
import { getPresence } from '@/server/presence-actions';
import { usePolling } from './use-polling';

async function loadPresence(): Promise<Presence | null> {
  const { presence, authorized } = await getPresence();
  if (!authorized) location.assign('/login');
  return presence;
}

/** Стан Mac з Upstash через серверний екшен; початкове значення приходить із серверного рендеру. */
export function usePresence(initial: Presence | null) {
  return usePolling(loadPresence, 3000, initial);
}

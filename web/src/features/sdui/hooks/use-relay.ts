'use client';
import { useEffect, useRef, useState } from 'react';
import type { UiEvent } from '@awake/contracts';
import { createRelayConnection, type RelaySnapshot } from '../sources/relay-source';

const INITIAL: RelaySnapshot = { status: 'connecting', tree: null, reason: null };

/** Viewer relay на весь час життя сторінки: стан, дерево від агента і відправка подій. */
export function useRelay(enabled = true) {
  const [snapshot, setSnapshot] = useState<RelaySnapshot>(INITIAL);
  const connection = useRef<ReturnType<typeof createRelayConnection> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const current = createRelayConnection(setSnapshot);
    connection.current = current;
    return () => {
      current.close();
      connection.current = null;
    };
  }, [enabled]);

  const send = async (event: UiEvent) => {
    if (!connection.current) throw new Error('Relay не підключений');
    await connection.current.send(event);
  };

  return { ...snapshot, send };
}

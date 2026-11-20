'use client';
import { useCallback, useEffect, useState } from 'react';
import type { AppResponse, CommandRequest, LogRecord, MacState, SessionRecord } from '@awake/contracts';
import { usePolling } from './use-polling';

const TOKEN_KEY = 'awake.deviceToken';

type PairingStatus = 'checking' | 'paired' | 'unpaired' | 'failed';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* приватний режим: токен житиме лише до перезавантаження */
  }
}

async function call<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = (await res.json()) as AppResponse<T>;
  if (!body.ok) throw Object.assign(new Error(body.error?.message ?? res.statusText), { code: body.error?.code });
  return body.data as T;
}

/**
 * Сполучення з агентом (код із #p= → токен пристрою) і дані з його API.
 * Сторінку роздає сам агент, тож запити йдуть на той самий origin.
 */
export function useLocalAgent() {
  const [token, setToken] = useState<string | null>(null);
  const [pairing, setPairing] = useState<PairingStatus>('checking');

  useEffect(() => {
    const code = new URLSearchParams(location.hash.slice(1)).get('p');
    // Код одноразовий: прибираємо його з адреси одразу, щоб не лишився в історії.
    if (code) history.replaceState(null, '', location.pathname);
    const saved = readToken();
    if (!code) {
      setToken(saved);
      setPairing(saved ? 'paired' : 'unpaired');
      return;
    }
    call<{ token: string }>('/api/devices/pair', null, { method: 'POST', body: JSON.stringify({ code }) })
      .then(({ token: fresh }) => {
        saveToken(fresh);
        setToken(fresh);
        setPairing('paired');
      })
      .catch(() => {
        // Код протух, але старий токен пристрою ще може працювати.
        setToken(saved);
        setPairing(saved ? 'paired' : 'failed');
      });
  }, []);

  const enabled = pairing === 'paired' && !!token;
  const state = usePolling(() => (enabled ? call<MacState | null>('/api/state', token) : Promise.resolve(null)), 2000, null);
  const sessions = usePolling(() => (enabled ? call<SessionRecord[]>('/api/sessions?limit=20', token) : Promise.resolve([])), 10000, []);
  const logs = usePolling(() => (enabled ? call<LogRecord[]>('/api/logs?limit=30', token) : Promise.resolve([])), 10000, []);

  const { refresh: refreshState } = state;
  const { refresh: refreshSessions } = sessions;
  useEffect(() => {
    if (enabled) {
      void refreshState();
      void refreshSessions();
    }
  }, [enabled, refreshState, refreshSessions]);

  const sendCommand = useCallback(
    async (command: CommandRequest) => {
      await call<{ id: string }>('/api/commands', token, { method: 'POST', body: JSON.stringify(command) });
      // Mac застосовує команду за секунду-дві; підтягуємо стан трохи згодом.
      setTimeout(() => void refreshState(), 1500);
      setTimeout(() => void refreshSessions(), 3000);
    },
    [token, refreshState, refreshSessions],
  );

  const forget = useCallback(() => {
    saveToken(null);
    setToken(null);
    setPairing('unpaired');
  }, []);

  return { pairing, state: state.data, stateError: state.error, sessions: sessions.data, logs: logs.data, sendCommand, forget };
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import { callAgent } from './agent-api';

const TOKEN_KEY = 'awake.deviceToken';

export type PairingStatus = 'checking' | 'paired' | 'unpaired' | 'failed';

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

/** Сполучення з агентом: код із #p= міняємо на токен пристрою. */
export function useDevicePairing() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<PairingStatus>('checking');

  useEffect(() => {
    const code = new URLSearchParams(location.hash.slice(1)).get('p');
    // Код одноразовий: прибираємо його з адреси одразу, щоб не лишився в історії.
    if (code) history.replaceState(null, '', location.pathname);
    const saved = readToken();
    if (!code) {
      setToken(saved);
      setStatus(saved ? 'paired' : 'unpaired');
      return;
    }
    callAgent<{ token: string }>('/api/devices/pair', null, { method: 'POST', body: JSON.stringify({ code }) })
      .then(({ token: fresh }) => {
        saveToken(fresh);
        setToken(fresh);
        setStatus('paired');
      })
      .catch(() => {
        // Код протух, але старий токен пристрою ще може працювати.
        setToken(saved);
        setStatus(saved ? 'paired' : 'failed');
      });
  }, []);

  const forget = useCallback(() => {
    saveToken(null);
    setToken(null);
    setStatus('unpaired');
  }, []);

  return { status, token, forget };
}

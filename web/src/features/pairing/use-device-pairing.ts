'use client';
import { useCallback, useEffect, useState } from 'react';
import type { DevicePairingPoll } from '@awake/contracts';
import { callAgent } from './agent-api';

const TOKEN_KEY = 'awake.deviceToken';

/** waiting: код прийнято, чекаємо «Дозволити» на Mac; denied: на Mac відхилили. */
export type PairingStatus = 'checking' | 'paired' | 'unpaired' | 'failed' | 'waiting' | 'denied';

const POLL_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Сполучення з агентом: код із #p= міняємо на запит, а після підтвердження на Mac — на токен пристрою. */
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
    let cancelled = false;
    // Код міняємо на запит, а далі чекаємо, поки на Mac натиснуть «Дозволити», як у месенджерах.
    (async () => {
      try {
        const { requestId } = await callAgent<{ requestId: string }>('/api/devices/pair', null, {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        if (cancelled) return;
        setStatus('waiting');
        while (!cancelled) {
          const poll = await callAgent<DevicePairingPoll>(`/api/devices/pair/${encodeURIComponent(requestId)}`, null);
          if (poll.status === 'pending') {
            await sleep(POLL_MS);
            continue;
          }
          if (poll.status === 'approved' && poll.token) {
            saveToken(poll.token);
            setToken(poll.token);
            setStatus('paired');
          } else {
            setToken(saved);
            setStatus(saved ? 'paired' : poll.status === 'denied' ? 'denied' : 'failed');
          }
          return;
        }
      } catch {
        if (cancelled) return;
        // Код протух, але старий токен пристрою ще може працювати.
        setToken(saved);
        setStatus(saved ? 'paired' : 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const forget = useCallback(() => {
    saveToken(null);
    setToken(null);
    setStatus('unpaired');
  }, []);

  return { status, token, forget };
}

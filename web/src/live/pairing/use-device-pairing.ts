'use client';
import { useCallback, useEffect, useState } from 'react';
import { requestPairing, takePairingCode } from './request-pairing';

const TOKEN_KEY = 'macontrol:deviceToken';
/** TODO(cutover): ключ до перейменування проєкту; прибрати, коли всі браузери вже перечитали токен (після 2026-12). */
const LEGACY_TOKEN_KEY = 'awake.deviceToken';

/** waiting: код прийнято, чекаємо «Дозволити» на Mac; denied: на Mac відхилили. */
export type PairingStatus = 'checking' | 'paired' | 'unpaired' | 'failed' | 'waiting' | 'denied';

function readToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) return token;
    // Один раз переносимо токен зі старого ключа, щоб браузер не довелося сполучати заново.
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return legacy;
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
    const code = takePairingCode();
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
        const poll = await requestPairing(code, '/api/devices/pair', {
          onWaiting: () => setStatus('waiting'),
          isCancelled: () => cancelled,
        });
        if (!poll) return;
        if (poll.status === 'approved' && poll.token) {
          saveToken(poll.token);
          setToken(poll.token);
          setStatus('paired');
        } else {
          setToken(saved);
          setStatus(saved ? 'paired' : poll.status === 'denied' ? 'denied' : 'failed');
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

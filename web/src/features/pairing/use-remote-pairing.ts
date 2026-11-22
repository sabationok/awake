'use client';
import { useEffect, useState } from 'react';
import { requestPairing, takePairingCode } from './request-pairing';

/** noCode — сторінку відкрили без `#p=`; approved — кукі пристрою вже стоїть, ведемо на дашборд. */
export type RemotePairingStatus = 'checking' | 'noCode' | 'waiting' | 'approved' | 'denied' | 'failed';

/** Проксі Vercel до Mac через webhooxy: `/api/mac/pair` → `relay:request` → агент. */
const PAIR_PATH = '/api/mac/pair';

/**
 * Дистанційне сполучення з будь-якої мережі. Токен пристрою JS не бачить: на «Дозволити»
 * Mac ставить HttpOnly-кукі `mc_device`, і далі дашборд підключається до relay за нею.
 */
export function useRemotePairing() {
  const [status, setStatus] = useState<RemotePairingStatus>('checking');

  useEffect(() => {
    const code = takePairingCode();
    if (!code) return setStatus('noCode');
    let cancelled = false;
    requestPairing(code, PAIR_PATH, { onWaiting: () => setStatus('waiting'), isCancelled: () => cancelled }).then(
      (poll) => {
        if (!poll) return;
        if (poll.status === 'approved') {
          setStatus('approved');
          location.replace('/');
        } else setStatus(poll.status === 'denied' ? 'denied' : 'failed');
      },
      () => !cancelled && setStatus('failed'),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

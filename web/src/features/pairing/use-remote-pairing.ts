'use client';
import { useEffect, useState } from 'react';
import { STEP_PATH } from '@/features/redirects/redirect-flows';
import { requestPairing, takePairingCode } from './request-pairing';

/** noCode — сторінку відкрили без `#p=`; approved — кукі пристрою вже стоїть, ведемо у Web UI. */
export type RemotePairingStatus = 'checking' | 'noCode' | 'waiting' | 'approved' | 'denied' | 'failed';

/** Проксі Vercel до Mac через webhooxy: `/api/mac/pair` → `relay:request` → агент. */
const PAIR_PATH = '/api/mac/pair';

/**
 * Дистанційне сполучення з будь-якої мережі. Токен пристрою JS не бачить: на «Дозволити»
 * Mac ставить HttpOnly-кукі `mc_device`, і далі Web UI підключається до relay за нею.
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
          location.replace(STEP_PATH.dashboard);
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

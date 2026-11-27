'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { STEP_PATH } from '@/live/redirects/redirect-flows';
import { SoloPage, StatusPage } from '@/shell/solo-page';
import { requestPairing, takePairingCode } from './request-pairing';

type Status = 'checking' | 'scan' | 'waiting' | 'denied' | 'failed';

const TEXT: Record<Exclude<Status, 'checking'>, { label: string; footer: string }> = {
  scan: {
    label: 'Потрібне сполучення',
    footer: 'Цей пристрій ще не сполучений з Mac. Відскануй QR у MaControl на Mac → «Пристрої» → Tailscale.',
  },
  waiting: { label: 'Підтверди на Mac', footer: 'На Mac з’явилось питання «Це ви?». Натисни «Дозволити», і Web UI відкриється тут сам.' },
  denied: { label: 'Сполучення відхилено', footer: 'На Mac натиснули «Відхилити». Щоб спробувати знову, відскануй QR ще раз.' },
  failed: { label: 'Посилання застаріло', footer: 'Код діє дві хвилини і лише раз. Відскануй новий QR у MaControl на Mac → «Пристрої».' },
};

/**
 * Пейринг через Tailscale (`/app/pair/`): код із QR → «Дозволити?» на Mac → опитування. Після схвалення агент сам
 * ставить HttpOnly-кукі `mc_device` і `mc_session`: токена в JS немає, сторінка лише переходить у Web UI.
 */
export function TailnetPairingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const code = takePairingCode();
    if (!code) return setStatus('scan');
    let cancelled = false;
    requestPairing(code, '/api/devices/pair', { onWaiting: () => setStatus('waiting'), isCancelled: () => cancelled })
      .then((poll) => {
        if (!poll || cancelled) return;
        if (poll.status === 'approved') router.replace(STEP_PATH.dashboard);
        else setStatus(poll.status === 'denied' ? 'denied' : 'failed');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === 'checking') return <SoloPage />;
  return <StatusPage {...TEXT[status]} />;
}

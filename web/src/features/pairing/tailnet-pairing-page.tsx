'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { STEP_PATH } from '@/features/redirects/redirect-flows';
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
 * Пейринг через Tailscale: код із QR → «Дозволити?» на Mac → опитування. Після схвалення агент сам ставить
 * HttpOnly-кукі `mc_device` і `mc_session`: токена в JS немає, сторінка лише переходить у Web UI.
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

  if (status === 'checking') return <PageFrame title="MaControl">{null}</PageFrame>;
  const text = TEXT[status];
  return (
    <PageFrame title="MaControl">
      <Group footer={text.footer}>
        <KeyValueRow label={text.label} />
      </Group>
    </PageFrame>
  );
}

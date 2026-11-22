'use client';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { useRemotePairing, type RemotePairingStatus } from './use-remote-pairing';

const TEXT: Record<Exclude<RemotePairingStatus, 'checking'>, { label: string; footer: string }> = {
  noCode: {
    label: 'Немає коду',
    footer: 'Відкрий це посилання з QR у MaControl на Mac → «Пристрої» → «Дистанційно».',
  },
  waiting: {
    label: 'Підтверди на Mac',
    footer: 'На Mac з’явилось питання про дистанційний запит. Натисни «Дозволити», і дашборд відкриється тут сам.',
  },
  approved: {
    label: 'Сполучено',
    footer: 'Відкриваю дашборд…',
  },
  denied: {
    label: 'Сполучення відхилено',
    footer: 'На Mac натиснули «Відхилити». Щоб спробувати знову, відскануй QR ще раз.',
  },
  failed: {
    label: 'Не вдалося сполучити',
    footer: 'Код діє дві хвилини і лише раз, а Mac має бути онлайн з увімкненим webhooxy. Відскануй новий QR.',
  },
};

/** `/pair#p=<code>`: сполучення пристрою з Mac через Vercel і webhooxy, без пароля дашборду. */
export function RemotePairingPage() {
  const status = useRemotePairing();
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

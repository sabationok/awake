'use client';
import { useMemo } from 'react';
import { Button } from '@/components/button';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { useDevicePairing, type PairingStatus } from '@/features/pairing/use-device-pairing';
import { useUiTree } from '../hooks/use-ui-tree';
import { localSource } from '../sources/local-source';
import type { UiSource } from '../sources/ui-source';
import { SduiPage } from './sdui-page';

const PAIRING_TEXT: Record<Exclude<PairingStatus, 'checking' | 'paired'>, { label: string; footer: string }> = {
  unpaired: {
    label: 'Потрібне сполучення',
    footer: 'Цей пристрій ще не сполучений з Mac. Відскануй QR у MaControl на Mac → «Пристрої», поки ти в довіреній Wi-Fi.',
  },
  waiting: {
    label: 'Підтверди на Mac',
    footer: 'На Mac з’явилось питання «Це ви?». Натисни «Дозволити», і пульт відкриється тут сам.',
  },
  denied: {
    label: 'Сполучення відхилено',
    footer: 'На Mac натиснули «Відхилити». Щоб спробувати знову, відскануй QR ще раз.',
  },
  failed: {
    label: 'Посилання застаріло',
    footer: 'Код діє дві хвилини і лише раз. Відскануй новий QR у MaControl на Mac → «Пристрої».',
  },
};

/** Локальний пульт: спершу сполучення з Mac, далі дерево з його API. */
export function LocalSduiPage() {
  const { status, token, forget } = useDevicePairing();
  const source = useMemo(() => (token ? localSource(token) : null), [token]);

  if (status === 'checking') return <PageFrame title="MaControl">{null}</PageFrame>;

  if (!source) {
    const text = PAIRING_TEXT[status === 'paired' ? 'unpaired' : status];
    return (
      <PageFrame title="MaControl">
        <Group footer={text.footer}>
          <KeyValueRow label={text.label} />
        </Group>
      </PageFrame>
    );
  }

  return <LocalTree source={source} onForget={forget} />;
}

function LocalTree({ source, onForget }: { source: UiSource; onForget: () => void }) {
  const { tree, send } = useUiTree(source);
  return (
    <SduiPage
      tree={tree}
      send={send}
      accessory={
        <Button variant="plain" className="mb-1 h-8 px-3 text-[13px]" onClick={onForget}>
          Забути пристрій
        </Button>
      }
    />
  );
}

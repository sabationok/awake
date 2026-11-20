'use client';
import { useMemo } from 'react';
import { Button } from '@/components/button';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { useDevicePairing } from '@/features/pairing/use-device-pairing';
import { localSource } from '../sources/local-source';
import { SduiPage } from './sdui-page';

/** Локальний пульт: спершу сполучення з Mac, далі дерево з його API. */
export function LocalSduiPage() {
  const { status, token, forget } = useDevicePairing();
  const source = useMemo(() => (token ? localSource(token) : null), [token]);

  if (status === 'checking') return <PageFrame title="MacCC">{null}</PageFrame>;

  if (!source) {
    return (
      <PageFrame title="MacCC">
        <Group
          footer={
            status === 'failed'
              ? 'Посилання застаріло. Відкрий пульт ще раз із дашборду: код діє кілька хвилин і лише один раз.'
              : 'Цей пристрій ще не сполучений з Mac. Відкрий пульт із дашборду, поки ти в довіреній Wi-Fi.'
          }
        >
          <KeyValueRow label="Потрібне сполучення" />
        </Group>
      </PageFrame>
    );
  }

  return (
    <SduiPage
      source={source}
      accessory={
        <Button variant="plain" className="mb-1 h-8 px-3 text-[13px]" onClick={forget}>
          Забути пристрій
        </Button>
      }
    />
  );
}

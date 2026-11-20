'use client';
import type { Presence } from '@awake/contracts';
import { ExternalLink } from 'lucide-react';
import { FlexRow } from '@/components/flex';
import { Group } from '@/components/group';
import { PageFrame } from '@/components/page-frame';
import { MacStatusGroup } from '../components/mac-status-group';
import { useNow } from '../hooks/use-now';
import { usePresence } from '../hooks/use-presence';

/**
 * Дашборд на Vercel: лише стан з Upstash. Керування живе на самому Mac,
 * тож у довіреній мережі тут з'являється посилання на локальний пульт.
 */
interface RemoteDashboardPageProps {
  initial: Presence | null;
  /** false, поки в env Vercel немає ключів Upstash. */
  configured: boolean;
  logout: () => Promise<void>;
}

export function RemoteDashboardPage({ initial, configured, logout }: RemoteDashboardPageProps) {
  const now = useNow();
  const { data: presence } = usePresence(initial);

  return (
    <PageFrame
      title="Awake"
      accessory={
        <form action={logout}>
          <button type="submit" className="pb-1.5 text-[15px] text-accent">Вийти</button>
        </form>
      }
    >
      {configured ? (
        <MacStatusGroup state={presence?.state ?? null} updatedAt={presence?.updatedAt} now={now} />
      ) : (
        <Group footer="Додай базу Upstash до проєкту на Vercel: дашборд читає стан Mac звідти.">
          <div className="px-4 py-3 text-[15px]">Upstash не налаштовано</div>
        </Group>
      )}
      <Group
        title="Керування"
        footer={
          presence?.localUrl
            ? 'Відкриється сторінка на самому Mac. Працює лише в тій самій Wi-Fi.'
            : 'Керувати можна з довіреної Wi-Fi: Mac публікує свою адресу лише там.'
        }
      >
        {presence?.localUrl ? (
          <a href={presence.localUrl} className="block px-4 py-3 text-[15px] text-accent">
            <FlexRow gap="sm" justify="between">
              Відкрити пульт на Mac
              <ExternalLink size={16} />
            </FlexRow>
          </a>
        ) : (
          <div className="px-4 py-3 text-[15px] text-secondary">Пульт недоступний</div>
        )}
      </Group>
    </PageFrame>
  );
}

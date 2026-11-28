'use client';
import type { StateFull, UiPageLayout } from '@macontrol/contracts';
import { useMemo, useState } from 'react';
import type { Tagged } from '@/live/pairing/agent-api';
import type { UiSource } from '@/live/sources';
import { useUiLayout } from '@/live/use-ui-layout';
import { useLiveState } from '@/live/use-live-state';
import { AppStateProvider } from '@/sdui/app-state-store';
import { ServerRuntimeProvider } from '@/sdui/runtime';
import { toReadOnlyLayout } from '@/sdui/page-layout';
import { Banner, Shell } from '@/shell/app-shell';
import type { ShellResponse } from './layout-response';

const POLL_MS = 5000;

/**
 * Джерело Vercel: індекс з `/api/ui/shell` (разом зі stage, причиною й пульсом агента — їх віддаємо в `onMeta`) і
 * сторінки з `/api/ui/pages/<id>` з ETag. Браузер нічого не підміняє.
 */
function vercelSource(onMeta: (meta: ShellResponse) => void): UiSource {
  return {
    async shell() {
      const res = await fetch('/api/ui/shell', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const meta = (await res.json()) as ShellResponse;
      onMeta(meta);
      return { tag: null, data: meta.shell };
    },
    async page(pageId, tag): Promise<Tagged<UiPageLayout> | null | undefined> {
      const res = await fetch(`/api/ui/pages/${encodeURIComponent(pageId)}`, { headers: tag ? { 'If-None-Match': tag } : {} });
      if (res.status === 304) return null;
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(String(res.status));
      return { tag: res.headers.get('ETag'), data: toReadOnlyLayout((await res.json()) as UiPageLayout) };
    },
    /**
     * Стейт з `/api/ui/state` (ключ Upstash, scope all) раз на `POLL_MS`: патчів з Vercel немає, тож кожна нова
     * версія приходить як `state.full`. `304` — та сама.
     */
    async live(onMessage, signal) {
      let tag: string | null = null;
      while (!signal.aborted) {
        const res: Response = await fetch('/api/ui/state', { signal, headers: tag ? { 'If-None-Match': tag } : {} });
        if (res.ok) {
          tag = res.headers.get('ETag');
          const full = (await res.json()) as StateFull;
          onMessage({ type: 'state.full', ...full });
        } else if (res.status !== 304) {
          throw new Error(String(res.status));
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
    },
  };
}

/** Web UI на Vercel: лише перегляд індексу й сторінок з Upstash. Керування — лише у Web UI на Mac. */
export function DemoApp() {
  const [meta, setMeta] = useState<ShellResponse | null>(null);
  const source = useMemo(() => vercelSource(setMeta), []);
  const { shell, pages, error, loaded } = useUiLayout(source, POLL_MS);
  const state = useLiveState(source);
  const offline = Boolean(error);

  if (!loaded || (!meta && !shell)) return <div className="s-loading">{offline ? 'Сервер Web UI недоступний' : 'MaControl…'}</div>;
  if (!shell) return <div className="s-loading">{`Інтерфейсу немає${meta?.reason ? ` — Upstash: ${meta.reason}` : ''}`}</div>;
  return (
    <AppStateProvider value={state}>
      <ServerRuntimeProvider mode="readonly">
        <Shell
          shell={shell}
          pages={pages}
          banner={<SourceBanner meta={meta} offline={offline} />}
          sideNote={
            <>
              Живі дані · Upstash
              <br />
              Дії не надсилаються на сервер
            </>
          }
          trailing={
            <span className="u-badge" style={{ ['--tone' as string]: 'var(--ok)' }}>
              Live · перегляд
            </span>
          }
        />
      </ServerRuntimeProvider>
    </AppStateProvider>
  );
}

/** Банер, коли дані не свіжі: сервер Web UI перестав відповідати або агент не шле пульс. */
function SourceBanner({ meta, offline }: { meta: ShellResponse | null; offline: boolean }) {
  if (offline) return <Banner title="Сервер Web UI не відповідає — показую останнє отримане" details={[]} />;
  if (meta?.agent?.status === 'offline') {
    return <Banner title="Mac офлайн — показую останнє опубліковане" details={['Пульс агента не приходить: сервер зупинено або Mac без мережі.']} />;
  }
  return null;
}

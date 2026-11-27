'use client';
import type { UiTree } from '@awake/contracts';
import { useEffect, useMemo, useState } from 'react';
import { DemoProvider } from '@/demo/demo-store';
import { ServerRuntimeProvider } from '@/sdui/runtime';
import { toReadOnlyNodes } from '@/sdui/to-read-only-nodes';
import { Banner, Shell } from '@/shell/app-shell';
import type { TreeOrigin, TreeResponse } from './tree-response';

const POLL_MS = 5000;

const ORIGIN_LABEL: Record<TreeOrigin, string> = { upstash: 'Upstash', 'web-swift': 'Web Swift', fixtures: 'вбудовані фікстури' };

/** `next dev`: контролки живі в пам'яті вкладки (DemoProvider). Деплой на Vercel: лише перегляд, нічого не надсилається. */
const DEMO = process.env.NODE_ENV === 'development';

/**
 * Дерево з `/api/tree` раз на 5 с. Джерело (Upstash → Web Swift → фікстури) вибирає сервер; браузер нічого не підміняє.
 * Якщо сервер Umbra не відповів, лишається останнє отримане дерево, а `offline` каже про це банеру.
 */
function useTree(): { data: TreeResponse | null; offline: boolean } {
  const [state, setState] = useState<{ data: TreeResponse | null; offline: boolean }>({ data: null, offline: false });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/tree', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as TreeResponse;
        if (alive) setState({ data, offline: false });
      } catch {
        if (alive) setState((prev) => ({ ...prev, offline: true }));
      }
    };
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return state;
}

/** Web Umbra на Vercel: показує дерево з Upstash / Web Swift / фікстур. Керування — лише у Web UI на Mac. */
export function DemoApp() {
  const { data, offline } = useTree();
  const readOnlyTree = useMemo<UiTree | null>(
    () => (data && !DEMO ? { ...data.tree, pages: data.tree.pages.map((page) => ({ ...page, children: toReadOnlyNodes(page.children) })) } : null),
    [data],
  );
  if (!data) return <div className="s-loading">{offline ? 'Сервер Web Umbra недоступний' : 'MaControl…'}</div>;
  const live = data.origin !== 'fixtures';
  const shell = (
    <Shell
      tree={readOnlyTree ?? data.tree}
      banner={<SourceBanner data={data} offline={offline} />}
      sideNote={
        <>
          {live ? `Живі дані · ${ORIGIN_LABEL[data.origin]}` : 'Демо-дерево'}
          <br />
          Дії не надсилаються на сервер
        </>
      }
      trailing={
        <span className="u-badge" style={{ ['--tone' as string]: live ? 'var(--ok)' : 'var(--accent)' }}>
          {live ? (DEMO ? 'Live · демо-дії' : 'Live · перегляд') : 'Демо'}
        </span>
      }
    />
  );
  return DEMO ? <DemoProvider>{shell}</DemoProvider> : <ServerRuntimeProvider mode="readonly">{shell}</ServerRuntimeProvider>;
}

/** Банер, коли дерево не живе (фікстури) або сервер Umbra перестав відповідати: звідки дані і чому не свіжі. */
function SourceBanner({ data, offline }: { data: TreeResponse; offline: boolean }) {
  if (data.origin !== 'fixtures' && !offline) return null;
  return (
    <Banner
      title={offline ? 'Сервер Web Umbra не відповідає — показую останнє отримане дерево' : `Живого дерева немає — показую вбудований зразок від ${data.sampledAt}`}
      details={[
        ...(data.misses.length ? [data.misses.map((m) => `${ORIGIN_LABEL[m.origin]}: ${m.reason}`).join(' · ')] : []),
        DEMO ? 'Структура сторінок та сама, що в агента; значення вигадані, дії не надсилаються.' : 'Структура сторінок та сама, що в агента; значення вигадані, керування лише у Web UI на Mac.',
      ]}
    />
  );
}

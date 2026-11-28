'use client';
import type { UiTree } from '@awake/contracts';
import { useEffect, useMemo, useState } from 'react';
import { ServerRuntimeProvider } from '@/sdui/runtime';
import { toReadOnlyNodes } from '@/sdui/to-read-only-nodes';
import { Banner, Shell } from '@/shell/app-shell';
import type { TreeOrigin, TreeResponse } from './tree-response';

const POLL_MS = 5000;

const ORIGIN_LABEL: Record<TreeOrigin, string> = { upstash: 'Upstash', 'web-swift': 'Web Swift' };

/**
 * Дерево з `/api/tree` раз на 5 с. Джерело (Upstash → Web Swift) вибирає сервер; браузер нічого не підміняє.
 * Якщо сервер не відповів, лишається останнє отримане дерево, а `offline` каже про це банеру.
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
        if (alive) setState((prev) => ({ data: data.tree || !prev.data ? data : { ...prev.data, misses: data.misses }, offline: false }));
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

/** Web UI на Vercel: лише перегляд дерева з Upstash / Web Swift. Керування — лише у Web UI на Mac. */
export function DemoApp() {
  const { data, offline } = useTree();
  const tree = data?.tree ?? null;
  const readOnlyTree = useMemo<UiTree | null>(
    () => (tree ? { ...tree, pages: tree.pages.map((page) => ({ ...page, children: toReadOnlyNodes(page.children) })) } : null),
    [tree],
  );
  if (!data) return <div className="s-loading">{offline ? 'Сервер Web UI недоступний' : 'MaControl…'}</div>;
  if (!readOnlyTree || !data.origin) {
    const reasons = data.misses.map((m) => `${ORIGIN_LABEL[m.origin]}: ${m.reason}`).join(' · ');
    return <div className="s-loading">{`Дерева немає${reasons ? ` — ${reasons}` : ''}`}</div>;
  }
  return (
    <ServerRuntimeProvider mode="readonly">
      <Shell
        tree={readOnlyTree}
        banner={<SourceBanner data={data} offline={offline} />}
        sideNote={
          <>
            {`Живі дані · ${ORIGIN_LABEL[data.origin]}`}
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
  );
}

/** Банер, коли дерево не свіже: сервер Web UI перестав відповідати або агент не шле пульс. */
function SourceBanner({ data, offline }: { data: TreeResponse; offline: boolean }) {
  if (offline) return <Banner title="Сервер Web UI не відповідає — показую останнє отримане дерево" details={[]} />;
  if (data.agent?.status === 'offline') {
    return <Banner title="Mac офлайн — показую останнє опубліковане дерево" details={['Пульс агента не приходить: сервер зупинено або Mac без мережі.']} />;
  }
  return null;
}

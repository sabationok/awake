'use client';
import type { UiPage } from '@awake/contracts';
import { ChevronRight, DatabaseZap, FlaskConical, Menu, Power, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DemoProvider, useDemo } from '@/demo/demo-store';
import type { TreeOrigin, TreeResponse } from '@/app/api/tree/route';
import { sidebarPages, sidebarSections, type SidebarNode } from '@/lib/sidebar-sections';
import { PageNodes } from '@/sdui/node-view';
import { IconButton, SymbolIcon } from '@/ui/primitives';

function useHash(): [string, (id: string) => void] {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(window.location.hash.slice(1)));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return [hash, (id) => (window.location.hash = id)];
}

const POLL_MS = 5000;

const ORIGIN_LABEL: Record<TreeOrigin, string> = { upstash: 'Upstash', 'web-swift': 'Web Swift', fixtures: 'вбудовані фікстури' };

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

export function AppShell() {
  const { data, offline } = useTree();
  if (!data) return <div className="s-loading">{offline ? 'Сервер Web Umbra недоступний' : 'MaControl…'}</div>;
  return (
    <DemoProvider>
      <Shell data={data} offline={offline} />
    </DemoProvider>
  );
}

function Shell({ data, offline }: { data: TreeResponse; offline: boolean }) {
  const { tree, origin } = data;
  const live = origin !== 'fixtures';
  const sections = useMemo(() => sidebarSections(tree), [tree]);
  const all = useMemo(() => sidebarPages(sections), [sections]);
  const [hash, go] = useHash();
  const [drawer, setDrawer] = useState(false);
  const page = all.find((p) => p.id === hash) ?? all[0];
  const node = sections.flatMap((s) => s.nodes).find((n) => n.page.id === page?.id || n.children.some((c) => c.id === page?.id));
  const [open, setOpen] = useState<Set<string>>(() => new Set(node ? [node.page.id] : []));
  const disabledOf = (p: UiPage) => tree.modules.find((m) => m.id === p.module)?.disabled;

  useEffect(() => {
    if (node) setOpen((prev) => (prev.has(node.page.id) ? prev : new Set(prev).add(node.page.id)));
  }, [node]);

  const navigate = (id: string) => {
    go(id);
    setDrawer(false);
  };
  const tabs = node && node.children.length ? [node.page, ...node.children] : [];

  return (
    <div className="s-app" data-drawer={drawer ? 'open' : undefined}>
      <aside className="s-side">
        <div className="s-host">
          <span className="s-host-icon" data-online={tree.app.online ? 'true' : undefined}>
            <Power />
          </span>
          <div>
            <b>{tree.app.title}</b>
            <small>{tree.app.host} · {tree.app.online ? 'онлайн' : 'офлайн'}</small>
          </div>
          <IconButton className="u-icon-btn s-close" icon={X} label="Закрити меню" onClick={() => setDrawer(false)} />
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section.key} className="s-group">
              {section.key === 'system' ? <span className="s-group-title">Система</span> : null}
              {section.nodes.map((n) => (
                <NavNode
                  key={n.page.id}
                  node={n}
                  current={page?.id}
                  open={open.has(n.page.id)}
                  disabled={disabledOf(n.page)}
                  onToggle={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(n.page.id)) next.delete(n.page.id);
                      else next.add(n.page.id);
                      return next;
                    })
                  }
                  onNavigate={navigate}
                />
              ))}
            </div>
          ))}
        </nav>
        <div className="s-demo">
          <FlaskConical />
          <span>
            {live ? `Живі дані · ${ORIGIN_LABEL[origin]}` : 'Демо-дерево'}
            <br />
            Дії не надсилаються на сервер
          </span>
        </div>
      </aside>
      <div className="s-scrim" onClick={() => setDrawer(false)} />
      <main className="s-main">
        <header className="s-top">
          <IconButton className="u-icon-btn s-burger" icon={Menu} label="Меню" onClick={() => setDrawer(true)} />
          {node && node.page.id !== page?.id ? (
            <span className="s-crumb">
              {node.page.title}
              <ChevronRight />
            </span>
          ) : null}
          <h1>{page?.title}</h1>
          {page?.scope === 'local' ? <span className="u-chip">лише в локальній мережі</span> : null}
          <span className="u-badge s-demo-badge" style={{ ['--tone' as string]: live ? 'var(--ok)' : 'var(--accent)' }}>
            {live ? 'Live · демо-дії' : 'Демо'}
          </span>
        </header>
        {tabs.length ? (
          <div className="s-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={t.id === page?.id} onClick={() => navigate(t.id)}>
                {t.title}
              </button>
            ))}
          </div>
        ) : null}
        <SourceBanner data={data} offline={offline} />
        <div className="s-content" key={page?.id}>
          {page ? <PageNodes nodes={page.children} /> : null}
        </div>
      </main>
      <Toasts />
    </div>
  );
}

function NavNode({ node, current, open, disabled, onToggle, onNavigate }: { node: SidebarNode; current?: string; open: boolean; disabled?: string; onToggle: () => void; onNavigate: (id: string) => void }) {
  const active = node.page.id === current;
  const inside = node.children.some((c) => c.id === current);
  return (
    <Fragment>
      <div className="s-item" data-active={active ? 'true' : undefined} data-inside={inside ? 'true' : undefined} data-disabled={disabled ? 'true' : undefined} title={disabled}>
        <button type="button" className="s-item-main" disabled={Boolean(disabled)} onClick={() => onNavigate(node.page.id)}>
          <SymbolIcon symbol={node.page.icon.symbol} className="s-item-icon" />
          <span>{node.page.title}</span>
        </button>
        {node.children.length && !disabled ? (
          <button type="button" className="s-chevron" aria-label={open ? 'Згорнути' : 'Розгорнути'} aria-expanded={open} onClick={onToggle}>
            <ChevronRight />
          </button>
        ) : null}
      </div>
      {open && !disabled
        ? node.children.map((child) => (
            <button key={child.id} type="button" className="s-sub" data-active={child.id === current ? 'true' : undefined} onClick={() => onNavigate(child.id)}>
              {child.title}
            </button>
          ))
        : null}
    </Fragment>
  );
}

/** Банер, коли дерево не живе (фікстури) або сервер Umbra перестав відповідати: звідки дані і чому не свіжі. */
function SourceBanner({ data, offline }: { data: TreeResponse; offline: boolean }) {
  if (data.origin !== 'fixtures' && !offline) return null;
  return (
    <div className="s-banner" role="status">
      <DatabaseZap />
      <div>
        <b>{offline ? 'Сервер Web Umbra не відповідає — показую останнє отримане дерево' : `Живого дерева немає — показую вбудований зразок від ${data.sampledAt}`}</b>
        {data.misses.length ? (
          <small>{data.misses.map((m) => `${ORIGIN_LABEL[m.origin]}: ${m.reason}`).join(' · ')}</small>
        ) : null}
        <small>Структура сторінок та сама, що в агента; значення вигадані, дії не надсилаються.</small>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useDemo();
  return (
    <div className="u-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="u-toast">
          <b>{t.title}</b>
          <small>{t.detail}</small>
        </div>
      ))}
    </div>
  );
}

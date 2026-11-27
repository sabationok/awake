'use client';
import type { UiPage, UiTree } from '@awake/contracts';
import { ChevronRight, FlaskConical, Menu, Power, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DemoProvider, useDemo } from '@/demo/demo-store';
import { fixtureTree } from '@/fixtures/tree';
import type { TreeResponse } from '@/app/api/tree/route';
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

type TreeSource = { kind: 'live' } | { kind: 'fixtures'; reason: string };

const POLL_MS = 5000;

/** Живе дерево з `/api/tree` (Upstash) раз на 5 с; без нього — фікстури, щоб демо працювало й без агента. */
function useTree(): { tree: UiTree | null; source: TreeSource | null } {
  const [state, setState] = useState<{ tree: UiTree | null; source: TreeSource | null }>({ tree: null, source: null });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = (await fetch('/api/tree', { cache: 'no-store' }).then((r) => r.json())) as TreeResponse;
        if (!alive) return;
        if (res.source === 'live') setState({ tree: res.tree, source: { kind: 'live' } });
        else setState((prev) => (prev.source?.kind === 'live' ? prev : { tree: fixtureTree(), source: { kind: 'fixtures', reason: res.reason } }));
      } catch {
        if (alive) setState((prev) => (prev.tree ? prev : { tree: fixtureTree(), source: { kind: 'fixtures', reason: 'Сервер Umbra недоступний' } }));
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
  const { tree, source } = useTree();
  return <DemoProvider>{tree && source ? <Shell tree={tree} source={source} /> : <div className="s-loading">MaControl…</div>}</DemoProvider>;
}

function Shell({ tree, source }: { tree: UiTree; source: TreeSource }) {
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
            {source.kind === 'live' ? 'Живі дані з Mac' : `Фікстури: ${source.reason}`}
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
          <span className="u-badge s-demo-badge" style={{ ['--tone' as string]: source.kind === 'live' ? 'var(--ok)' : 'var(--accent)' }}>
            {source.kind === 'live' ? 'Live · демо-дії' : 'Демо'}
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

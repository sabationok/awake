'use client';
import type { UiPage, UiTree } from '@awake/contracts';
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, DatabaseZap, FlaskConical, Info, Menu, Power, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DemoProvider, useDemo, type LogType } from '@/demo/demo-store';
import type { TreeOrigin, TreeResponse } from '@/app/api/tree/route';
import { levelOf, pathTo, sidebarPages, sidebarSections, type SidebarNode } from '@/lib/sidebar-sections';
import { PageNodes } from '@/sdui/node-view';
import { AppearanceSection } from './appearance';
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
  const path = useMemo(() => pathTo(sections, page?.id), [sections, page?.id]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(path.slice(0, -1).map((n) => n.page.id)));
  const disabledOf = (p: UiPage) => tree.modules.find((m) => m.id === p.module)?.disabled;
  const labelOf = useMemo(() => moduleLabels(tree, sections), [tree, sections]);
  const pathKey = path.map((n) => n.page.id).join('/');

  // Предки поточної сторінки в меню завжди розгорнуті.
  useEffect(() => {
    const ids = pathKey.split('/').slice(0, -1).filter(Boolean);
    setOpen((prev) => (ids.every((id) => prev.has(id)) ? prev : new Set([...prev, ...ids])));
  }, [pathKey]);

  const navigate = (id: string) => {
    go(id);
    setDrawer(false);
  };
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const { tabs } = levelOf(path);
  const crumbs = path.slice(0, -1);
  const parent = crumbs[crumbs.length - 1];

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
                <NavNode key={n.page.id} node={n} current={page?.id} path={path} open={open} disabledOf={disabledOf} labelOf={labelOf} onToggle={toggle} onNavigate={navigate} />
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
          {parent ? (
            <IconButton className="u-icon-btn s-back" icon={ChevronLeft} label={`Назад: ${labelOf(parent.page)}`} onClick={() => navigate(parent.page.id)} />
          ) : null}
          {crumbs.map((c) => (
            <span key={c.page.id} className="s-crumb">
              <button type="button" onClick={() => navigate(c.page.id)}>
                {labelOf(c.page)}
              </button>
              <ChevronRight />
            </span>
          ))}
          <h1>{page ? labelOf(page) : null}</h1>
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
          {page?.id === 'settings' ? <AppearanceSection /> : null}
          {page ? <PageNodes nodes={page.children} /> : null}
        </div>
      </main>
      <Toasts />
    </div>
  );
}

interface NavProps {
  node: SidebarNode;
  current?: string;
  path: SidebarNode[];
  open: Set<string>;
  disabledOf: (page: UiPage) => string | undefined;
  labelOf: (page: UiPage) => string;
  onToggle: (id: string) => void;
  onNavigate: (id: string) => void;
}

/** Пункт верхнього рівня меню (модуль або системна сторінка). */
function NavNode({ node, ...props }: NavProps) {
  const { current, path, open, disabledOf, labelOf, onToggle, onNavigate } = props;
  const active = node.page.id === current;
  const inside = !active && path.some((n) => n.page.id === node.page.id);
  const disabled = disabledOf(node.page);
  const expanded = open.has(node.page.id) && !disabled;
  return (
    <Fragment>
      <div className="s-item" data-active={active ? 'true' : undefined} data-inside={inside ? 'true' : undefined} data-disabled={disabled ? 'true' : undefined} title={disabled}>
        <button type="button" className="s-item-main" disabled={Boolean(disabled)} onClick={() => onNavigate(node.page.id)}>
          <SymbolIcon symbol={node.page.icon.symbol} className="s-item-icon" />
          <span>{labelOf(node.page)}</span>
        </button>
        {node.children.length && !disabled ? (
          <button type="button" className="s-chevron" aria-label={expanded ? 'Згорнути' : 'Розгорнути'} aria-expanded={expanded} onClick={() => onToggle(node.page.id)}>
            <ChevronRight />
          </button>
        ) : null}
      </div>
      {expanded ? node.children.map((child) => <SubNode key={child.page.id} node={child} depth={1} {...props} />) : null}
    </Fragment>
  );
}

/** Вкладений пункт меню; якщо в нього свої діти (Групи під Telegram), розгортається глибше з відступом. */
function SubNode({ node, depth, ...props }: NavProps & { depth: number }) {
  const { current, path, open, labelOf, onToggle, onNavigate } = props;
  const active = node.page.id === current;
  const inside = !active && path.some((n) => n.page.id === node.page.id);
  const expanded = open.has(node.page.id);
  return (
    <Fragment>
      <div className="s-sub-row" style={{ ['--depth' as string]: depth }}>
        <button type="button" className="s-sub" data-active={active || inside ? 'true' : undefined} onClick={() => onNavigate(node.page.id)}>
          {labelOf(node.page)}
        </button>
        {node.children.length ? (
          <button type="button" className="s-chevron" aria-label={expanded ? 'Згорнути' : 'Розгорнути'} aria-expanded={expanded} onClick={() => onToggle(node.page.id)}>
            <ChevronRight />
          </button>
        ) : null}
      </div>
      {expanded ? node.children.map((child) => <SubNode key={child.page.id} node={child} depth={depth + 1} {...props} />) : null}
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

const LOG_ICON: Record<LogType, LucideIcon> = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert };

function Toasts() {
  const { toasts } = useDemo();
  return (
    <div className="u-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="u-toast" data-type={t.type} role={t.type === 'error' ? 'alert' : undefined}>
          {(() => {
            const Icon = LOG_ICON[t.type];
            return <Icon />;
          })()}
          <div>
            <b>{t.title}</b>
            <small>{t.detail}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Назва пункту меню, крихти й заголовка. Сторінка, з якої починається модуль (верхній рівень або вкладений модуль на
 * кшталт Груп під Telegram), зветься назвою модуля з `tree.modules`, а не своїм `title`: так пункт меню не
 * перейменовується, коли сервер міняє заголовок сторінки (Awake → «Сесія», «Огляд»). Системні сторінки й підсторінки
 * модуля лишаються зі своїм `title`.
 */
function moduleLabels(tree: UiTree, sections: { nodes: SidebarNode[] }[]): (page: UiPage) => string {
  const parentModule = new Map<string, string | undefined>();
  const walk = (nodes: SidebarNode[], parent?: UiPage) =>
    nodes.forEach((n) => {
      parentModule.set(n.page.id, parent?.module);
      walk(n.children, n.page);
    });
  sections.forEach((s) => walk(s.nodes));
  const titles = new Map(tree.modules.map((m) => [m.id, m.title]));
  return (page) => {
    const startsModule = page.group === 'modules' && parentModule.get(page.id) !== page.module;
    return (startsModule ? titles.get(page.module) : undefined) ?? page.title;
  };
}

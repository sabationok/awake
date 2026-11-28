'use client';
import qrcode from 'qrcode-generator';
import type {
  UiButtons,
  UiChart,
  UiControl,
  UiItem,
  UiList,
  UiMenuItem,
  UiNode,
  UiNotice,
  UiQr,
  UiRow,
  UiSection,
  UiStatus,
  UiTabs,
  UiTimer,
} from '@awake/contracts';
import { Check, Copy, Inbox, Info, TriangleAlert, X, CircleX } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { findSymbolIcon } from '@/lib/icons';
import { Badge, Button, Chip, Dialog, Dot, DotMenu, EmptyState, IconButton, Segmented, Select, Slider, Spinner, Switch, SymbolIcon, toneStyle, toneVar } from '@/ui/primitives';
import { EventScope, useBusySend, useEventScope } from './event-scope';
import { useRuntime } from './runtime';
import { fromButton, fromMenuItem, useRunAction, type RunnableAction } from './use-run-action';

/* ---------- time ---------- */

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function remaining(until: string | null | undefined, now: number): string | null {
  if (!until) return null;
  const s = Math.floor((new Date(until).getTime() - now) / 1000);
  if (s <= 0) return null;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ---------- dispatcher ---------- */

/** Вузли, які малюються як блок панелі (з роздільником), а не як окремий рядок поза нею. */
export function NodeView({ node }: { node: UiNode }) {
  switch (node.type) {
    case 'section': return <SectionNode node={node} />;
    case 'row': return <RowNode node={node} />;
    case 'status': return <StatusNode node={node} />;
    case 'switch': return <SettingSwitchNode node={node} />;
    case 'select': return <SettingSelectNode node={node} />;
    case 'buttons': return <ButtonsNode node={node} />;
    case 'list': return <ListNode node={node} />;
    case 'text': return <p className="u-section-foot" style={{ padding: '12px 14px', color: node.tone ? toneVar(node.tone) : undefined }}>{node.text}</p>;
    case 'tabs': return <TabsNode node={node} />;
    case 'timer': return <TimerNode node={node} />;
    case 'chart': return <ChartNode node={node} />;
    case 'item': return <ItemNode node={node} />;
    case 'notice': return <NoticeNode node={node} />;
    case 'separator': return <div className="u-sep" data-word={node.word ? 'true' : undefined} style={{ padding: '10px 14px' }}>{node.word}</div>;
    case 'qr': return <QrNode node={node} />;
  }
}

/** Вузли верхнього рівня сторінки: секції — як є, решта — у власній панелі. */
export function PageNodes({ nodes }: { nodes: UiNode[] }) {
  return (
    <>
      {nodes.map((node) =>
        node.type === 'section' || node.type === 'notice' ? (
          <NodeView key={node.id} node={node} />
        ) : node.type === 'tabs' ? (
          // Вкладки верхнього рівня (період статистики): кожна секція вкладки — окремий блок із проміжком, не одна панель.
          <TabsNode key={node.id} node={node} page />
        ) : (
          <div key={node.id} className="u-panel">
            <NodeView node={node} />
          </div>
        ),
      )}
    </>
  );
}

/* ---------- section ---------- */

function SectionActions({ actions }: { actions: UiMenuItem[] }) {
  const [run, dialog, busy] = useRunAction();
  if (actions.length === 0) return null;
  const [first] = actions;
  return (
    <>
      {actions.length === 1 && first ? (
        <Button size="sm" variant={first.variant} busy={busy} disabled={first.disabled || first.scope === 'mac'} title={first.hint} onClick={() => run(fromMenuItem(first))}>
          {first.label}
        </Button>
      ) : (
        <MenuOf items={actions} busy={busy} run={(item) => run(fromMenuItem(item))} />
      )}
      {dialog}
    </>
  );
}

function MenuOf({ items, run, busy }: { items: UiMenuItem[]; run: (item: UiMenuItem) => void; busy?: boolean }) {
  return (
    <DotMenu
      busy={busy}
      entries={items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon ? findSymbolIcon(item.icon.symbol) : undefined,
        variant: item.variant,
        disabled: item.disabled || item.scope === 'mac',
        hint: item.scope === 'mac' ? (item.hint ?? 'Лише в аппці на Mac') : item.hint,
        onSelect: () => run(item),
      }))}
    />
  );
}

/** Секція — зона помилок: відхилена дія її контролів з'являється червоним під секцією. */
function SectionNode({ node }: { node: UiSection }) {
  const scope = useEventScope();
  return (
    <EventScope value={scope.run}>
      <SectionBody node={node} error={scope.error} />
    </EventScope>
  );
}

function SectionBody({ node, error }: { node: UiSection; error: string | null }) {
  const children = node.children;
  const hasHead = node.title || node.status || node.actions?.length;
  return (
    <section className="u-section">
      {hasHead ? (
        <div className="u-section-head">
          <h3>{node.title}</h3>
          {node.status ? <Badge {...node.status} /> : null}
          {node.actions?.length ? <SectionActions actions={node.actions} /> : null}
        </div>
      ) : null}
      {node.kind === 'summary' && children.every((child) => child.type === 'row') ? (
        <div className="u-tiles">
          {children.map((child) => (child.type === 'row' ? <TileNode key={child.id} node={child} /> : null))}
        </div>
      ) : children.length ? (
        <div className="u-panel">
          {children.map((child) =>
            child.type === 'section' ? (
              <div key={child.id} style={{ padding: 12 }}>
                <NodeView node={child} />
              </div>
            ) : child.type === 'notice' ? (
              <div key={child.id} style={{ padding: 10 }}>
                <NodeView node={child} />
              </div>
            ) : (
              <NodeView key={child.id} node={child} />
            ),
          )}
        </div>
      ) : null}
      {node.footer ? <p className="u-section-foot">{node.footer}</p> : null}
      {error ? (
        <p className="u-section-foot" data-error="true" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** Плитка підсумку: назва, велике число і, якщо агент дав, зміна відносно минулого періоду. */
function TileNode({ node }: { node: UiRow }) {
  const compare = node.compare;
  const delta = compare?.deltaPct;
  const tone =
    delta == null || delta === 0 || !compare?.goodWhen ? 'flat' : (delta > 0) === (compare.goodWhen === 'up') ? 'good' : 'bad';
  return (
    <div className="u-tile">
      <b className="u-tile-value tnum">{node.value ?? '—'}</b>
      {compare ? (
        <span className="u-tile-compare tnum" data-tone={tone}>
          {delta == null ? 'нове' : `${delta > 0 ? '↑' : delta < 0 ? '↓' : ''}${Math.abs(Math.round(delta))}%`}
          <small>минулий: {compare.previous}</small>
        </span>
      ) : null}
      <span className="u-tile-label" title={node.label}>{node.label}</span>
    </div>
  );
}

/* ---------- rows & controls ---------- */

/**
 * Контрол праворуч у рядку. Значення — зі сторінки сервера (у demo — локальна зміна поверх фікстури); поки подія
 * летить, контрол заблокований, а кнопка стає лоадером. Нове значення приходить разом із перечитаною сторінкою.
 */
function ControlView({ id, control, label }: { id: string; control: UiControl; label: string }) {
  switch (control.type) {
    case 'switch': return <SwitchControl id={id} control={control} label={label} />;
    case 'select': return <SelectControl id={id} control={control} label={label} />;
    case 'slider': return <SliderControl control={control} label={label} />;
    case 'button': return <ActionButton item={fromButton(control.button)} disabled={control.button.disabled} size="sm" />;
  }
}

function SwitchControl({ id, control, label }: { id: string; control: Extract<UiControl, { type: 'switch' }>; label: string }) {
  const runtime = useRuntime();
  const { send, busy } = useBusySend();
  const value = control.setting ? runtime.setting(control.setting.module, control.setting.key, control.value) : runtime.local(id, control.value);
  return (
    <Switch
      label={label}
      checked={value}
      busy={busy}
      disabled={control.disabled}
      onChange={(next) => {
        if (control.setting) return void send({ type: 'setting', change: { ...control.setting, value: next } }, label);
        runtime.setLocal(id, next);
        const action = next ? control.on : control.off;
        if (!action) return;
        void send({ type: 'action', action }, `${label}: ${next ? 'увімк.' : 'вимк.'}`);
      }}
    />
  );
}

function SelectControl({ id, control, label }: { id: string; control: Extract<UiControl, { type: 'select' }>; label: string }) {
  const runtime = useRuntime();
  const { send, busy } = useBusySend();
  const value = control.setting ? runtime.setting(control.setting.module, control.setting.key, control.value) : runtime.local(id, control.value);
  return (
    <Select
      id={`ctl-${id}`}
      label={label}
      value={value}
      options={control.options}
      disabled={control.disabled || busy}
      onChange={(next) => {
        if (control.setting) return void send({ type: 'setting', change: { ...control.setting, value: next } }, label);
        runtime.setLocal(id, next);
        if (!control.action) return;
        void send({ type: 'action', action: { ...control.action, params: { ...control.action.params, value: next } } }, label);
      }}
    />
  );
}

/** Повзунок: поки його тягнуть, показує своє значення; після відпускання — знову значення сервера. */
function SliderControl({ control, label }: { control: Extract<UiControl, { type: 'slider' }>; label: string }) {
  const { send, busy } = useBusySend();
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? control.value;
  return (
    <>
      <Slider
        label={label}
        value={value}
        min={control.min}
        max={control.max}
        step={control.step}
        disabled={control.disabled || busy}
        onChange={setDrag}
        onCommit={(v) => {
          void send({ type: 'action', action: { ...control.action, params: { ...control.action.params, value: v } } }, label).finally(() => setDrag(null));
        }}
      />
      <span className="u-row-value" style={{ width: 34 }}>{value}</span>
    </>
  );
}

/** Кнопка дії зі своїм лоадером і діалогом підтвердження / форми. */
function ActionButton({ item, disabled, size }: { item: RunnableAction; disabled?: boolean; size?: 'sm' }) {
  const [run, dialog, busy] = useRunAction();
  return (
    <>
      <Button size={size} variant={item.variant} busy={busy} disabled={disabled} onClick={() => run(item)}>
        {item.label}
      </Button>
      {dialog}
    </>
  );
}

function RowNode({ node }: { node: UiRow }) {
  const now = useNow(Boolean(node.countdownTo));
  const left = remaining(node.countdownTo, now);
  const hint = [node.hint, left].filter(Boolean).join(' · ');
  return (
    <div className="u-row" data-prominent={node.prominent ? 'true' : undefined}>
      {node.icon ? <SymbolIcon symbol={node.icon.symbol} tone={node.icon.tone} /> : null}
      <div className="u-row-text">
        <span className="u-row-label">{node.label}</span>
        {hint || node.dot ? (
          <span className="u-row-hint">
            {node.dot ? <Dot tone={node.dot.tone} pulse={node.dot.pulse} /> : null}
            <span className="tnum">{hint}</span>
          </span>
        ) : null}
      </div>
      {node.control ? (
        <div className="u-row-control">
          <ControlView id={node.id} control={node.control} label={node.label} />
        </div>
      ) : node.value ? (
        <span className="u-row-value">{node.value}</span>
      ) : null}
    </div>
  );
}

function StatusNode({ node }: { node: UiStatus }) {
  const now = useNow(Boolean(node.countdownTo));
  const left = remaining(node.countdownTo, now);
  return (
    <div className="u-row" data-prominent="true" style={toneStyle(node.tone)}>
      {node.icon ? <SymbolIcon symbol={node.icon.symbol} tone={node.icon.tone} /> : <Dot tone={node.tone} pulse={node.pulse} />}
      <div className="u-row-text">
        <span className="u-row-label">{node.label}</span>
        {node.hint ? <span className="u-row-hint">{node.hint}</span> : null}
      </div>
      {left || node.value ? (
        <span className="u-row-value tnum" style={{ fontSize: 'var(--fs-xl)', color: 'var(--tone)', fontWeight: 500 }}>
          {left ?? node.value}
        </span>
      ) : null}
    </div>
  );
}

function SettingSwitchNode({ node }: { node: Extract<UiNode, { type: 'switch' }> }) {
  return (
    <RowNode
      node={{
        id: node.id,
        type: 'row',
        label: node.label,
        hint: node.hint,
        icon: node.icon,
        control: { type: 'switch', value: node.value, disabled: node.disabled, setting: { module: node.module, key: node.key } },
      }}
    />
  );
}

function SettingSelectNode({ node }: { node: Extract<UiNode, { type: 'select' }> }) {
  return (
    <RowNode
      node={{
        id: node.id,
        type: 'row',
        label: node.label,
        hint: node.hint,
        icon: node.icon,
        control: { type: 'select', value: node.value, options: node.options, disabled: node.disabled, setting: { module: node.module, key: node.key } },
      }}
    />
  );
}

function ButtonsNode({ node }: { node: UiButtons }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))`, gap: 8, padding: 12 }}>
      {node.buttons.map((button) => (
        <ActionButton key={button.id} item={fromButton(button)} disabled={button.disabled} />
      ))}
    </div>
  );
}

function ListNode({ node }: { node: UiList }) {
  if (node.items.length === 0) return <EmptyState icon={Inbox} text={node.empty ?? 'Поки порожньо'} />;
  return (
    <div>
      {node.items.map((item, index) => (
        <div key={item.id} className="u-list-row" style={index ? { borderTop: '1px solid var(--line)' } : undefined}>
          <div className="u-row-text">
            <span className="u-row-label" style={{ fontWeight: 400 }}>{item.label}</span>
            {item.hint ? <span className="u-row-hint">{item.hint}</span> : null}
          </div>
          {item.value ? <span className="u-row-value">{item.value}</span> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Вкладки в сторінці — навігація: перемикаються одразу, без лоадера. Вкладка з налаштуванням ще й пише його на
 * сервер у фоні; до відповіді показуємо вибрану, далі — те, що повернув сервер. Без налаштування вибір живе тут.
 */
function TabsNode({ node, page }: { node: UiTabs; page?: boolean }) {
  const runtime = useRuntime();
  const send = useBusySend().send;
  const [chosen, setChosen] = useState<string | null>(null);
  const fallback = node.value ?? node.tabs[0]?.id ?? '';
  const value = chosen ?? (node.setting ? runtime.setting(node.setting.module, node.setting.key, fallback) : fallback);
  const active = node.tabs.find((tab) => tab.id === value) ?? node.tabs[0];
  const onChange = (next: string) => {
    setChosen(next);
    if (!node.setting || runtime.mode === 'readonly') return;
    void send({ type: 'setting', change: { ...node.setting, value: next } }).then(() => setChosen(null));
  };
  if (page) {
    return (
      <>
        <div className="u-page-tabs" data-sticky={node.sticky ? 'true' : undefined}>
          <Segmented value={active?.id ?? ''} options={node.tabs.map((tab) => ({ value: tab.id, label: tab.label }))} onChange={onChange} />
        </div>
        <PageNodes nodes={active?.children ?? []} />
      </>
    );
  }
  return (
    <div>
      <div style={{ padding: 12, display: 'flex', justifyContent: 'center', position: node.sticky ? 'sticky' : undefined, top: 0, zIndex: 2, background: 'var(--surface-1)', backdropFilter: 'var(--glass-blur)' }}>
        <Segmented value={active?.id ?? ''} options={node.tabs.map((tab) => ({ value: tab.id, label: tab.label }))} onChange={onChange} />
      </div>
      {active?.children.map((child) => (
        <div key={child.id} style={{ borderTop: '1px solid var(--line)' }}>
          <NodeView node={child} />
        </div>
      ))}
    </div>
  );
}

function TimerNode({ node }: { node: UiTimer }) {
  const now = useNow(Boolean(node.until));
  const left = remaining(node.until, now);
  let fraction: number | null = null;
  if (left && node.from && node.until) {
    const from = new Date(node.from).getTime();
    const until = new Date(node.until).getTime();
    fraction = Math.min(1, Math.max(0, (until - now) / (until - from || 1)));
  }
  // Від зеленого до червоного за часткою часу, що лишилась; без відліку — тон вузла.
  const color = fraction === null ? toneVar(node.tone) : `color-mix(in oklab, var(--ok) ${Math.round(fraction * 100)}%, var(--danger))`;
  return (
    <div className="u-big" style={{ ['--tone' as string]: color }}>
      <span className="u-big-value">{left ?? node.value}</span>
      {fraction !== null ? (
        <span className="u-progress">
          <i style={{ width: `${fraction * 100}%` }} />
        </span>
      ) : null}
      {node.caption ? <span className="u-big-caption">{node.caption}</span> : null}
    </div>
  );
}

/* ---------- chart ---------- */

function formatValue(value: number, format: UiChart['format']): string {
  switch (format) {
    case 'duration': {
      const h = Math.floor(value / 3600);
      const m = Math.round((value % 3600) / 60);
      return h ? `${h} год ${m} хв` : `${m} хв`;
    }
    case 'bytes': return value > 1e6 ? `${(value / 1e6).toFixed(1)} МБ` : `${Math.round(value / 1e3)} КБ`;
    case 'percent': return `${Math.round(value)}%`;
    case 'number': return value.toFixed(1);
    default: return String(Math.round(value));
  }
}

function formatBucket(iso: string, unit: UiChart['unit']): string {
  const d = new Date(iso);
  if (unit === 'minute' || unit === 'hour') return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  if (unit === 'month') return d.toLocaleDateString('uk-UA', { month: 'short' });
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
}

const SERIES_FALLBACK = ['accent', 'indigo', 'green', 'yellow', 'red'] as const;

function ChartNode({ node }: { node: UiChart }) {
  const starts = [...new Set(node.points.map((p) => p.start))].sort();
  const series = [...new Set(node.points.map((p) => p.series ?? ''))];
  const colorOf = (s: string, i: number) => toneVar(node.tones?.[s] ?? (s ? SERIES_FALLBACK[i % SERIES_FALLBACK.length] : (node.tone ?? 'accent')));
  const totals = starts.map((start) => node.points.filter((p) => p.start === start).reduce((sum, p) => sum + p.value, 0));
  const max = Math.max(1, node.limit ?? 0, ...totals);
  const total = totals.reduce((a, b) => a + b, 0);
  const W = 100;
  const H = 100;
  const slot = W / Math.max(1, starts.length);
  const bar = Math.max(0.6, slot * 0.62);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? starts.length - 1;

  return (
    <div className="u-chart">
      <div className="u-chart-head">
        <b>{node.title}</b>
        <span>
          {starts[shown] ? `${formatBucket(starts[shown], node.unit)} · ${formatValue(totals[shown] ?? 0, node.format)}` : formatValue(total, node.format)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={node.title} onPointerLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
        ))}
        {starts.map((start, i) => {
          let y = H;
          return (
            <g key={start} onPointerEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.45}>
              <rect x={i * slot} y="0" width={slot} height={H} fill="transparent" />
              {series.map((s, si) => {
                const value = node.points.find((p) => p.start === start && (p.series ?? '') === s)?.value ?? 0;
                const h = (value / max) * (H - 4);
                y -= h;
                return h > 0 ? <rect key={s} x={i * slot + (slot - bar) / 2} y={y} width={bar} height={h} rx="0.6" fill={colorOf(s, si)} /> : null;
              })}
            </g>
          );
        })}
        {node.limit ? (
          <line x1="0" x2={W} y1={H - (node.limit / max) * (H - 4)} y2={H - (node.limit / max) * (H - 4)} stroke="var(--danger)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      <div className="u-chart-axis">
        <span>{starts[0] ? formatBucket(starts[0], node.unit) : ''}</span>
        <span>{starts.at(-1) ? formatBucket(starts.at(-1) as string, node.unit) : ''}</span>
      </div>
      {series.length > 1 ? (
        <div className="u-legend">
          {series.map((s, i) => (
            <span key={s}>
              <span className="u-dot" style={{ background: colorOf(s, i) }} />
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- item ---------- */

function CopyValue({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="u-copy">
      {label ? <small>{label}</small> : null}
      <code>{value}</code>
      <IconButton
        icon={done ? Check : Copy}
        label="Копіювати"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(
            () => setDone(true),
            () => setDone(false),
          );
          setTimeout(() => setDone(false), 1500);
        }}
      />
    </div>
  );
}

function ItemNode({ node }: { node: UiItem }) {
  const [run, dialog, busy] = useRunAction();
  const actions = node.actions ?? [];
  const [single] = actions;
  return (
    <div className="u-item">
      <div className="u-item-head">
        {node.icon ? <SymbolIcon symbol={node.icon.symbol} tone={node.icon.tone} /> : null}
        <span className="u-item-title">{node.title}</span>
        {node.status ? <Badge {...node.status} /> : null}
        {node.control ? <ControlView id={node.id} control={node.control} label={node.title} /> : null}
        {actions.length === 1 && single ? (
          <Button size="sm" variant={single.variant} busy={busy} disabled={single.disabled || single.scope === 'mac'} title={single.scope === 'mac' ? (single.hint ?? 'Лише в аппці на Mac') : single.hint} onClick={() => run(fromMenuItem(single))}>
            {single.label}
          </Button>
        ) : actions.length > 1 ? (
          <MenuOf items={actions} busy={busy} run={(item) => run(fromMenuItem(item))} />
        ) : null}
      </div>
      {node.tags?.length ? (
        <div className="u-item-tags">
          {node.tags.map((tag) => (
            <Chip key={tag.label} label={tag.label} tone={tag.tone} />
          ))}
        </div>
      ) : null}
      {node.copy ? <CopyValue value={node.copy.value} label={node.copy.label} /> : null}
      {node.comment ? <p className="u-item-comment">{node.comment}</p> : null}
      {dialog}
    </div>
  );
}

/* ---------- notice / qr ---------- */

/** Сповіщення сторінки; хрестик шле `dismiss` серверу, і воно зникає з перечитаною сторінкою (у demo — одразу). */
function NoticeNode({ node }: { node: UiNotice }) {
  const runtime = useRuntime();
  const { send, busy } = useBusySend();
  if (runtime.dismissed(node.id)) return null;
  const tone = node.variant === 'error' ? 'red' : node.variant === 'warn' ? 'yellow' : 'accent';
  const Icon = node.icon ? (findSymbolIcon(node.icon.symbol) ?? Info) : node.variant === 'error' ? CircleX : node.variant === 'warn' ? TriangleAlert : Info;
  return (
    <div className="u-notice" data-sticky={node.sticky} style={toneStyle(tone)}>
      <Icon />
      <div className="u-notice-body">
        {node.title ? <b>{node.title}</b> : null}
        <span>{node.text}</span>
      </div>
      {node.dismiss ? (
        busy ? (
          <span className="u-icon-btn" aria-busy="true">
            <Spinner label="Закриваю" />
          </span>
        ) : (
          <IconButton
            icon={X}
            label="Закрити"
            onClick={() => {
              runtime.dismiss(node.id);
              if (node.dismiss) void send({ type: 'action', action: node.dismiss }, 'Сповіщення закрито');
            }}
          />
        )
      ) : null}
    </div>
  );
}

/** Декоративний QR-подібний візерунок: справжній код одноразовий і з Mac не виходить. */
/**
 * QR-код у стилі MaControl, як `QrCodeImage.swift` у Mac-аппці: заокруглені кути-маркери і крапки-модулі на білому.
 * Матриця справжня (рівень корекції M), тож код сканується; значення — зі сторінки сервера (у demo — з фікстур).
 */
function QrNode({ node }: { node: UiQr }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(node.value, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    const total = n + quiet * 2;
    const finder = (r: number, c: number) => (r < 7 && (c < 7 || c >= n - 7)) || (r >= n - 7 && c < 7);
    let dots = '';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.isDark(r, c) && !finder(r, c)) dots += `M${c + quiet + 0.06} ${r + quiet + 0.5}a.44 .44 0 1 0 .88 0a.44 .44 0 1 0 -.88 0`;
    const eyes = [[0, 0], [0, n - 7], [n - 7, 0]].map(([r, c]) => ({ x: (c ?? 0) + quiet, y: (r ?? 0) + quiet }));
    return { total, dots, eyes };
  }, [node.value]);
  const [zoomed, setZoomed] = useState(false);
  const runtime = useRuntime();
  const code = (
    <svg viewBox={`0 0 ${svg.total} ${svg.total}`} role="img" aria-label="QR-код">
      <rect width={svg.total} height={svg.total} fill="#fff" />
      {svg.eyes.map(({ x, y }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={7} height={7} rx={2.2} fill="#000" />
          <rect x={x + 1} y={y + 1} width={5} height={5} rx={1.2} fill="#fff" />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill="#000" />
        </g>
      ))}
      <path d={svg.dots} fill="#000" />
    </svg>
  );
  return (
    <div className="u-qr">
      <button type="button" className="u-qr-thumb" aria-label="Збільшити QR-код" onClick={() => setZoomed(true)}>
        {code}
      </button>
      <small>{runtime.mode === 'demo' ? 'Натисни, щоб збільшити · демо-код, справжній показує лише Mac.' : 'Натисни, щоб збільшити'}</small>
      {zoomed ? createPortal(
        <Dialog title="QR-код" onClose={() => setZoomed(false)} actions={<Button onClick={() => setZoomed(false)}>Закрити</Button>}>
          <div className="u-qr-zoom">{code}</div>
        </Dialog>,
        document.body,
      ) : null}
    </div>
  );
}

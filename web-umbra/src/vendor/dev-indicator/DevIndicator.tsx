import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { DevBuild } from './types'; // TEMP until contracts/ts lands
import { useDevTools, type DevTool } from './tools';

export type IndicatorMode = 'floating' | 'strip';
export type Side = 'left' | 'right';
export type StripEdge = 'top' | 'bottom';

export interface DevIndicatorProps {
  build: DevBuild;
  defaultMode?: IndicatorMode;
  defaultStripEdge?: StripEdge;
  /** For demos and screenshots only: start with the panel open. */
  defaultOpen?: boolean;
}

interface Prefs {
  mode: IndicatorMode;
  /** Floating button: which viewport side it sticks to. */
  side: Side;
  /** Floating button: vertical position, 0 = top (16px), 1 = bottom (16px). */
  y: number;
  stripEdge: StripEdge;
}

const STORAGE_PREFIX = 'dev-indicator:';
const GAP = 8;
const FAB_SIZE = 36;
const EDGE = 16;
const DRAG_THRESHOLD = 4;

const STRIP_HEIGHT = 24;
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function readPrefs(key: string): Record<string, unknown> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const v: unknown = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Floating position from saved prefs. Migrates the corner-based prefs (`corner`: tl → left/0, bl → left/1, tr → right/0,
 * br → right/1). Unknown or missing values fall back to bottom-left.
 */
export function parseFloatingPrefs(saved: Record<string, unknown>): { side: Side; y: number } {
  const side = saved.side === 'left' || saved.side === 'right' ? saved.side : undefined;
  const y = typeof saved.y === 'number' && saved.y >= 0 && saved.y <= 1 ? saved.y : undefined;
  if (side !== undefined && y !== undefined) return { side, y };
  const c = saved.corner;
  if (c === 'tl' || c === 'tr' || c === 'bl' || c === 'br') {
    return { side: c.endsWith('r') ? 'right' : 'left', y: c.startsWith('t') ? 0 : 1 };
  }
  return { side: side ?? 'left', y: y ?? 1 };
}

/** Viewport fraction (0..1) for a button top edge in px, clamped so the button stays 16px from top and bottom. */
function fractionFromTop(top: number): number {
  const range = Math.max(1, window.innerHeight - FAB_SIZE - 2 * EDGE);
  return Math.min(1, Math.max(0, (top - EDGE) / range));
}

function writePrefs(key: string, prefs: Prefs): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // storage blocked or full: the indicator still works, it just forgets the choice
  }
}

const isMode = (v: unknown): v is IndicatorMode => v === 'floating' || v === 'strip';
const isEdge = (v: unknown): v is StripEdge => v === 'top' || v === 'bottom';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** `dd.MM, HH:mm` in local time. */
function formatBuilt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="dvi-row">
      <span className="dvi-label">{label}</span>
      <span className={mono ? 'dvi-value dvi-mono' : 'dvi-value'}>{value}</span>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="dvi-seg" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          className="dvi-seg-btn"
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function DevIndicator({
  build,
  defaultMode = 'floating',
  defaultStripEdge = 'bottom',
  defaultOpen = false,
}: DevIndicatorProps) {
  const key = STORAGE_PREFIX + build.project.id;

  // The first render uses the defaults on the server and the client alike (SSR hydration); the saved choice is
  // applied right after mount, before paint.
  const [prefs, setPrefs] = useState<Prefs>({ mode: defaultMode, side: 'left', y: 1, stripEdge: defaultStripEdge });
  useIsoLayoutEffect(() => {
    const saved = readPrefs(key);
    const floating = parseFloatingPrefs(saved);
    setPrefs((p) => ({
      mode: isMode(saved.mode) ? saved.mode : p.mode,
      side: floating.side,
      y: floating.y,
      stripEdge: isEdge(saved.stripEdge) ? saved.stripEdge : p.stripEdge,
    }));
  }, [key]);
  const [open, setOpen] = useState(defaultOpen);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [snap, setSnap] = useState(false);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');

  // Animate only the snap that follows a release, for a moment.
  useEffect(() => {
    if (!snap) return;
    const t = setTimeout(() => setSnap(false), 160);
    return () => clearTimeout(t);
  }, [snap]);

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const lastDrag = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const touched = useRef(false);

  const tools = useDevTools();

  // Persist only after the user changes something, so defaults are not frozen into storage.
  useEffect(() => {
    if (touched.current) writePrefs(key, prefs);
  }, [key, prefs]);

  // Esc and an outside click close the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  // The strip reserves its own room instead of covering the page (like safeAreaInset on Swift): the root gets
  // --dvi-inset-top / --dvi-inset-bottom and data-dvi-strip, the CSS pads the body. Full-height layouts
  // (100vh / 100dvh) subtract the variables themselves.
  const shown = build.stage !== 'production';
  const stripEdge = shown && prefs.mode === 'strip' ? prefs.stripEdge : null;
  useIsoLayoutEffect(() => {
    const html = document.documentElement;
    if (!stripEdge) return;
    html.dataset.dviStrip = stripEdge;
    html.style.setProperty(`--dvi-inset-${stripEdge}`, `${STRIP_HEIGHT}px`);
    return () => {
      delete html.dataset.dviStrip;
      html.style.removeProperty(`--dvi-inset-${stripEdge}`);
    };
  }, [stripEdge]);

  // Open above the anchor when there is room, otherwise below (measured before paint).
  useIsoLayoutEffect(() => {
    if (!open || !rootRef.current || !panelRef.current) return;
    const top = rootRef.current.getBoundingClientRect().top;
    const next = top >= panelRef.current.offsetHeight + GAP ? 'above' : 'below';
    setPlacement((p) => (p === next ? p : next));
  }, [open, prefs.mode, prefs.side, prefs.y, prefs.stripEdge]);

  if (build.stage === 'production') return null;

  const update = (patch: Partial<Prefs>) => {
    touched.current = true;
    setPrefs((p) => ({ ...p, ...patch }));
  };

  const toggle = () => setOpen((o) => !o);

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (prefs.mode !== 'floating') return;
    suppressClick.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = rootRef.current!.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    // Keep the button on screen while dragging; the clamp to 16px applies on release.
    const x = Math.min(Math.max(0, d.ox + dx), window.innerWidth - FAB_SIZE);
    const y = Math.min(Math.max(0, d.oy + dy), window.innerHeight - FAB_SIZE);
    lastDrag.current = { x, y };
    setDragPos({ x, y });
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    const at = lastDrag.current;
    lastDrag.current = null;
    if (!d) return;
    if (d.moved && !cancelled && at) {
      // Snap to the nearest side (by the button's centre), keep the height it was dropped at.
      const centreX = at.x + FAB_SIZE / 2;
      update({
        side: centreX < window.innerWidth / 2 ? 'left' : 'right',
        y: fractionFromTop(at.y),
      });
      setSnap(true);
      // The click that follows a drag is swallowed.
      suppressClick.current = true;
    }
    setDragPos(null);
  };

  const onFabClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    toggle();
  };

  const copyPassport = () => {
    const text = JSON.stringify(build, null, 2);
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  const runTool = (t: DevTool) => {
    Promise.resolve()
      .then(() => t.run())
      .catch((err) => console.error('[dev-indicator]', t.id, err));
  };

  const { project, stage, version, buildNumber, git, builtAt, extra, sdks } = build;
  const isFloating = prefs.mode === 'floating';
  const align = !isFloating ? 'strip' : prefs.side;
  const stageLabel = stage === 'preview' ? 'preview' : 'dev';
  const commitLine = `${git.branch} · ${git.commit}`;
  // data-corner is kept for consumers that style [data-corner='bl'] (derived: y > .5 is the bottom).
  const corner = `${prefs.y > 0.5 ? 'b' : 't'}${prefs.side === 'left' ? 'l' : 'r'}`;

  // While dragging the button follows the pointer in px; otherwise it sits at its saved side and height (CSS).
  const rootStyle: CSSProperties | undefined = !isFloating
    ? undefined
    : dragPos
      ? { left: dragPos.x, top: dragPos.y }
      : ({ '--dvi-y': prefs.y } as CSSProperties);

  return (
    <div
      ref={rootRef}
      className="dvi-root"
      data-mode={prefs.mode}
      data-side={isFloating ? prefs.side : undefined}
      data-corner={isFloating ? corner : undefined}
      data-edge={isFloating ? undefined : prefs.stripEdge}
      data-stage={stage}
      data-dragging={dragPos ? '' : undefined}
      data-snap={snap ? '' : undefined}
      style={rootStyle}
    >
      {isFloating ? (
        <button
          type="button"
          className="dvi-fab"
          aria-label={`${project.displayName} ${version}`}
          aria-expanded={open}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => onPointerEnd(e, false)}
          onPointerCancel={(e) => onPointerEnd(e, true)}
          onClick={onFabClick}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
          </svg>
        </button>
      ) : (
        <button type="button" className="dvi-strip" aria-expanded={open} onClick={toggle}>
          <span className="dvi-dot" aria-hidden="true" />
          <span className="dvi-strip-name">{project.displayName}</span>
          <span className="dvi-strip-ver">v{version}</span>
          <span className="dvi-strip-git">{commitLine}</span>
          <span className="dvi-strip-time">{formatBuilt(builtAt)}</span>
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="dvi-panel"
          role="dialog"
          aria-label="Збірка для розробки"
          data-placement={placement}
          data-align={align}
        >
          <div className="dvi-head">
            <span className="dvi-title">{project.displayName}</span>
            <span className="dvi-badge">{stageLabel}</span>
          </div>

          <div className="dvi-rows">
            <Row label="Версія" value={buildNumber ? `${version} · #${buildNumber}` : version} />
            <Row label="Гілка" value={`${commitLine}${git.dirty ? ' •' : ''}`} mono />
            <Row label="Зібрано" value={formatBuilt(builtAt)} />
            {(extra ?? []).map((r, i) => (
              <Row key={`x${i}`} label={r.label} value={r.value} />
            ))}
            {(sdks ?? []).map((s, i) => (
              <Row key={`s${i}`} label={s.name} value={s.version} />
            ))}
          </div>

          <div className="dvi-section">Інструменти</div>
          <ul className="dvi-tools">
            <li>
              <button type="button" className="dvi-tool" onClick={copyPassport}>
                <span className="dvi-tool-icon" aria-hidden="true">⧉</span>
                Копіювати паспорт
              </button>
            </li>
            {tools.map((t) => (
              <li key={t.id}>
                <button type="button" className="dvi-tool" onClick={() => runTool(t)}>
                  <span className="dvi-tool-icon" aria-hidden="true">{t.icon ?? '›'}</span>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>

          <div className="dvi-footer">
            <Segmented
              label="Вигляд"
              value={prefs.mode}
              options={[['floating', 'Кнопка'], ['strip', 'Смужка']]}
              onChange={(m) => update({ mode: m })}
            />
            {!isFloating && (
              <Segmented
                label="Край смужки"
                value={prefs.stripEdge}
                options={[['bottom', 'Знизу'], ['top', 'Зверху']]}
                onChange={(edge) => update({ stripEdge: edge })}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

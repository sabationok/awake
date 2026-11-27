'use client';
import type { UiOption, UiTone } from '@awake/contracts';
import { ChevronDown, Info, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { resolveSymbolIcon } from '@/lib/icons';

/** Колір тону дерева в токенах Umbra. accent — помаранчевий акцент, orange — червоніший, щоб їх розрізняти. */
export function toneVar(tone: UiTone | undefined): string {
  switch (tone) {
    case 'accent': return 'var(--accent)';
    case 'orange': return 'var(--orange)';
    case 'green': return 'var(--ok)';
    case 'red': return 'var(--danger)';
    case 'yellow': return 'var(--warn)';
    case 'indigo': return 'var(--violet)';
    case 'gray':
    default: return 'var(--fg-3)';
  }
}

export const toneStyle = (tone: UiTone | undefined): CSSProperties => ({ ['--tone' as string]: toneVar(tone) });

export type ButtonVariant = 'accent' | 'default' | 'ghost' | 'warn' | 'danger';

export function Button({
  variant = 'default',
  size,
  icon: Icon,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm'; icon?: LucideIcon }) {
  return (
    <button type="button" className="u-btn" data-variant={variant} data-size={size} {...rest}>
      {Icon ? <Icon /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" className="u-icon-btn" aria-label={label} title={label} {...rest}>
      <Icon />
    </button>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      className="u-switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Select({ value, options, onChange, disabled, label, id }: { value: string; options: UiOption[]; onChange: (next: string) => void; disabled?: boolean; label: string; id?: string }) {
  return (
    <span className="u-select">
      <select id={id} aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown />
    </span>
  );
}

export function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (next: string) => void }) {
  return (
    <div className="u-seg" role="tablist">
      {options.map((option) => (
        <button key={option.value} type="button" role="tab" aria-pressed={option.value === value} aria-selected={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Повзунок: значення міняється одразу, `onCommit` — коли відпустили (як у контракті: дія на відпускання). */
export function Slider({ value, min, max, step, disabled, label, onChange, onCommit }: { value: number; min: number; max: number; step?: number; disabled?: boolean; label: string; onChange: (v: number) => void; onCommit: (v: number) => void }) {
  const p = ((value - min) / (max - min || 1)) * 100;
  return (
    <input
      className="u-slider"
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      disabled={disabled}
      style={{ ['--p' as string]: `${p}%` }}
      onChange={(event) => onChange(Number(event.target.value))}
      onPointerUp={(event) => onCommit(Number((event.target as HTMLInputElement).value))}
      onKeyUp={(event) => onCommit(Number((event.target as HTMLInputElement).value))}
    />
  );
}

export function Badge({ label, tone, pulse }: { label: string; tone: UiTone; pulse?: boolean }) {
  return (
    <span className="u-badge" data-pulse={pulse ? 'true' : undefined} style={toneStyle(tone)}>
      {label}
    </span>
  );
}

export function Dot({ tone, pulse }: { tone: UiTone; pulse?: boolean }) {
  return <span className="u-dot" data-pulse={pulse ? 'true' : undefined} style={toneStyle(tone)} />;
}

export function Chip({ label, tone }: { label: string; tone?: UiTone }) {
  return (
    <span className="u-chip" style={tone && tone !== 'gray' ? { color: toneVar(tone) } : undefined}>
      {label}
    </span>
  );
}

export function SymbolIcon({ symbol, tone, className }: { symbol: string; tone?: UiTone; className?: string }) {
  const Icon = resolveSymbolIcon(symbol);
  return (
    <span className={className ?? 'u-row-icon'} style={toneStyle(tone)}>
      <Icon />
    </span>
  );
}

export interface MenuEntry {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: string;
  disabled?: boolean;
  hint?: string;
  onSelect: () => void;
}

/** Меню «⋯»: закривається кліком поза ним і Escape. */
export function DotMenu({ entries, label = 'Дії' }: { entries: MenuEntry[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div className="u-menu-wrap" ref={ref}>
      <IconButton icon={MoreHorizontal} label={label} aria-expanded={open} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <div className="u-menu" role="menu">
          {entries.map(({ id, label: text, icon: Icon, variant, disabled, hint, onSelect }) => (
            <div key={id}>
              <button
                type="button"
                role="menuitem"
                data-variant={variant}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
              >
                {Icon ? <Icon /> : <span style={{ width: 14 }} />}
                {text}
              </button>
              {hint ? <small>{hint}</small> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Dialog({ title, children, actions, onClose }: { title: string; children?: ReactNode; actions: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="u-overlay" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="u-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {children}
        <div className="u-dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export function EmptyState({ text, icon: Icon = Info }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="u-empty">
      <Icon />
      {text}
    </div>
  );
}

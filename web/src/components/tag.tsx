import { cn } from '@/lib/cn';
import type { SymbolTone } from './symbol-icon';

/**
 * @ui Tag
 * @spec Маленький чіп-мітка без дій («Tailscale»). Колір — з тону, сірий за замовчуванням.
 * @keywords tag, chip, label, badge, pill
 */
const TONE: Record<SymbolTone, string> = {
  accent: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent',
  green: 'bg-[color-mix(in_srgb,var(--green)_14%,transparent)] text-green',
  orange: 'bg-[color-mix(in_srgb,var(--orange)_14%,transparent)] text-orange',
  red: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-red',
  gray: 'bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] text-secondary',
  indigo: 'bg-[color-mix(in_srgb,var(--indigo)_14%,transparent)] text-indigo',
  yellow: 'bg-[color-mix(in_srgb,var(--yellow)_18%,transparent)] text-yellow',
};

export function Tag({ label, tone = 'gray' }: { label: string; tone?: SymbolTone }) {
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-4', TONE[tone])}>{label}</span>;
}

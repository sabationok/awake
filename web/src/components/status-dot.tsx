import { cn } from '@/lib/cn';
import type { SymbolTone } from './symbol-icon';

/** Фон у кольорі тону: крапка стану, стовпчики графіка. */
export const TONE_BG: Record<SymbolTone, string> = {
  accent: 'bg-accent',
  green: 'bg-green',
  orange: 'bg-orange',
  red: 'bg-red',
  gray: 'bg-gray',
  indigo: 'bg-indigo',
  yellow: 'bg-yellow',
};

/**
 * @ui StatusDot
 * @spec Кружок стану поруч із текстом. Пульсує, коли стан активний.
 * @keywords status, indicator, dot, online, offline
 */
export function StatusDot({ tone, pulse = false }: { tone: SymbolTone; pulse?: boolean }) {
  return (
    <span className="relative flex size-2.5">
      {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', TONE_BG[tone])} />}
      <span className={cn('relative inline-flex size-2.5 rounded-full', TONE_BG[tone])} />
    </span>
  );
}

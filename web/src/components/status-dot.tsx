import { cn } from '@/lib/cn';
import type { SymbolTone } from './symbol-icon';

/**
 * @ui StatusDot
 * @spec Кружок стану поруч із текстом. Пульсує, коли стан активний.
 * @keywords status, indicator, dot, online, offline
 */
const TONE: Record<SymbolTone, string> = {
  accent: 'bg-accent',
  green: 'bg-green',
  orange: 'bg-orange',
  red: 'bg-red',
  gray: 'bg-gray',
  indigo: 'bg-indigo',
  yellow: 'bg-yellow',
};

export function StatusDot({ tone, pulse = false }: { tone: SymbolTone; pulse?: boolean }) {
  return (
    <span className="relative flex size-2.5">
      {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', TONE[tone])} />}
      <span className={cn('relative inline-flex size-2.5 rounded-full', TONE[tone])} />
    </span>
  );
}

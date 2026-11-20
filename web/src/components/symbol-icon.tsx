import type { UiTone } from '@awake/contracts';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui SymbolIcon
 * @spec Кольоровий квадрат з іконкою, як у «Системних параметрах».
 * @keywords icon, tile, badge, settings icon
 */
export type SymbolTone = UiTone;

const TONE: Record<SymbolTone, string> = {
  accent: 'bg-accent',
  green: 'bg-green',
  orange: 'bg-orange',
  red: 'bg-red',
  gray: 'bg-gray',
  indigo: 'bg-indigo',
  yellow: 'bg-yellow',
};

export type SymbolSize = 'sm' | 'lg';

const SIZE: Record<SymbolSize, string> = { sm: 'size-7', lg: 'size-9' };

export function SymbolIcon({ tone, size = 'sm', children }: { tone: SymbolTone; size?: SymbolSize; children: ReactNode }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-md text-[15px] text-white', SIZE[size], TONE[tone])}>
      {children}
    </span>
  );
}

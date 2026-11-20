'use client';

import type { UiTimer } from '@awake/contracts';
import { cn } from '@/lib/cn';
import { useCountdown } from '../hooks/use-countdown';
import type { NodeProps } from '../sdui.types';

/** Великий таймер по центру секції: відлік до `until` або `value`, коли відліку немає. */
export function TimerNode({ node }: NodeProps<UiTimer>) {
  const remaining = useCountdown(node.until);
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-4">
      <span
        className={cn('text-5xl font-semibold tabular-nums', remaining ? 'text-label' : 'text-secondary')}
        style={remaining && node.tone ? { color: `var(--${node.tone})` } : undefined}
      >
        {remaining ?? node.value}
      </span>
      {node.caption && <span className="text-[13px] text-secondary">{node.caption}</span>}
    </div>
  );
}

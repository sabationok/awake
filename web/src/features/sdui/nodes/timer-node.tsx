'use client';

import type { UiTimer } from '@awake/contracts';
import { cn } from '@/lib/cn';
import { useCountdown } from '../hooks/use-countdown';
import { useNow } from '../hooks/use-now';
import type { NodeProps } from '../sdui.types';

/** Великий таймер по центру секції: відлік до `until` або `value`, коли відліку немає. */
export function TimerNode({ node }: NodeProps<UiTimer>) {
  const remaining = useCountdown(node.until);
  const now = useNow();
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-4">
      <span
        className={cn('text-5xl font-semibold tabular-nums', remaining ? 'text-label' : 'text-secondary')}
        style={remaining ? { color: timerColor(node, now) } : undefined}
      >
        {remaining ?? node.value}
      </span>
      {node.caption && <span className="text-[13px] text-secondary">{node.caption}</span>}
    </div>
  );
}

/** Від зеленого (уся сесія попереду) до червоного (час майже вийшов) за часткою часу, що лишилась. */
function timerColor(node: UiTimer, now: number): string | undefined {
  if (!node.until) return undefined;
  const until = new Date(node.until).getTime();
  const from = node.from ? new Date(node.from).getTime() : NaN;
  if (!(until > from)) return node.tone ? `var(--${node.tone})` : undefined;
  const left = Math.min(1, Math.max(0, (until - now) / (until - from)));
  return `hsl(${Math.round(left * 120)} 75% 42%)`;
}

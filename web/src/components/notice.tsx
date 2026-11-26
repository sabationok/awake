import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * @ui Notice
 * @spec Сповіщення в сторінці: info (синій), warn (помаранчевий), error (червоний). Тонований фон, без рамки з одного боку.
 * sticky — прилипає до краю скрол-області, onClose — хрестик.
 * @keywords notice, alert, banner, warning, error, info, callout
 */
type Variant = 'info' | 'warn' | 'error';

const VARIANT: Record<Variant, string> = {
  info: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent',
  warn: 'bg-[color-mix(in_srgb,var(--orange)_14%,transparent)] text-orange',
  error: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-red',
};

const STICKY: Record<'top' | 'bottom', string> = { top: 'sticky top-0 z-10', bottom: 'sticky bottom-0 z-10' };

interface NoticeProps {
  variant: Variant;
  icon?: ReactNode;
  title?: string;
  text: string;
  onClose?: () => void;
  sticky?: 'top' | 'bottom';
}

export function Notice({ variant, icon, title, text, onClose, sticky }: NoticeProps) {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-xl px-4 py-3', VARIANT[variant], sticky && STICKY[sticky])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1 text-[13px] leading-5">
        {title && <div className="font-semibold">{title}</div>}
        <div>{text}</div>
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Закрити"
          onClick={onClose}
          className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md opacity-70 hover:opacity-100 active:opacity-50"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

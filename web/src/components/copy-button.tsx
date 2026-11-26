'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * @ui CopyButton
 * @spec Іконка «Копіювати» без тексту. Після копіювання на 1.5 с показує галочку.
 * @keywords copy, clipboard, icon button, value
 */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  };

  return (
    <button
      type="button"
      aria-label={label ?? 'Копіювати'}
      onClick={() => void copy()}
      className={cn('grid size-7 shrink-0 place-items-center rounded-md text-secondary transition-colors active:opacity-70', copied && 'text-green')}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

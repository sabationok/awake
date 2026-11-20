'use client';
import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Slider
 * @spec Повзунок macOS: нативний range з accent-кольором. Під час руху тримає своє значення,
 *   а `onCommit` кличе раз, коли повзунок відпустили. Нове `value` ззовні його перезаписує.
 * @keywords slider, range, volume, brightness, percent
 */
interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number;
  onCommit: (value: number) => void;
}

export function Slider({ value, onCommit, className, ...rest }: SliderProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <input
      {...rest}
      type="range"
      value={draft}
      onChange={(e) => setDraft(Number(e.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      className={cn('h-8 w-40 cursor-pointer accent-accent disabled:cursor-default disabled:opacity-40', className)}
    />
  );
}

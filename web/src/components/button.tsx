import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Button
 * @spec Кнопка macOS: filled — головна дія, plain — другорядна, destructive — зупинка.
 * @keywords button, action, primary, secondary, danger
 */
type Variant = 'filled' | 'plain' | 'destructive';

const VARIANT: Record<Variant, string> = {
  filled: 'bg-accent text-white active:opacity-80',
  plain: 'bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] text-label active:opacity-70',
  destructive: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-red active:opacity-70',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'plain', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'h-9 rounded-lg px-4 text-[15px] font-medium transition-opacity disabled:opacity-40',
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  );
}

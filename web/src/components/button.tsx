import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Button
 * @spec Кнопка macOS: filled — головна дія, plain — другорядна, destructive — зупинка. default / accent / warn / danger — кольори дій з сервера.
 * @keywords button, action, primary, secondary, danger
 */
export type ButtonVariant = 'filled' | 'plain' | 'destructive' | 'default' | 'accent' | 'warn' | 'danger';

const VARIANT: Record<ButtonVariant, string> = {
  filled: 'bg-accent text-white active:opacity-80',
  plain: 'bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] text-label active:opacity-70',
  destructive: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-red active:opacity-70',
  default: 'bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] text-label active:opacity-70',
  accent: 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent active:opacity-70',
  warn: 'bg-[color-mix(in_srgb,var(--orange)_14%,transparent)] text-orange active:opacity-70',
  danger: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-red active:opacity-70',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
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

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui Switch
 * @spec Перемикач iOS: капсула з повзунком, role="switch". Підпис іде поруч, сам перемикач його не малює.
 * @keywords switch, toggle, on off, boolean, setting
 */
interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, className, ...rest }: SwitchProps) {
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-green' : 'bg-[color-mix(in_srgb,var(--gray)_30%,transparent)]',
        className,
      )}
    >
      <span className={cn('absolute left-[2px] size-[27px] rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

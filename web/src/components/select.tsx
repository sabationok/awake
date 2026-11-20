import type { SelectHTMLAttributes } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * @ui Select
 * @spec Випадний список macOS: нативний select із тонким фоном і стрілками вгорі-внизу. Підпис лишається поруч.
 * @keywords select, dropdown, pop-up, picker, option
 */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex items-center">
      <select
        {...rest}
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-md bg-[color-mix(in_srgb,var(--gray)_18%,transparent)] py-1 pr-7 pl-3 text-[15px] text-label outline-none disabled:cursor-default disabled:opacity-40',
          className,
        )}
      >
        {children}
      </select>
      <ChevronsUpDown size={14} aria-hidden className="pointer-events-none absolute right-2 text-secondary" />
    </span>
  );
}

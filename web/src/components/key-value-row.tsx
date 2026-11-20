import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FlexRow } from './flex';

/**
 * @ui KeyValueRow
 * @spec Рядок групи: іконка, назва ліворуч, значення праворуч. Без значення лишає місце для дії.
 * prominent — головний рядок модуля: вищий, жирна назва, опис не обрізається.
 * @keywords row, label value, setting row, list item, prominent row
 */
interface KeyValueRowProps {
  label: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  prominent?: boolean;
}

const ROW: Record<'normal' | 'prominent', string> = {
  normal: 'min-h-11 px-4 py-2 text-[15px]',
  prominent: 'min-h-14 px-4 py-3 text-[15px]',
};

export function KeyValueRow({ label, value, icon, hint, prominent = false }: KeyValueRowProps) {
  return (
    <FlexRow gap="md" justify="between" className={ROW[prominent ? 'prominent' : 'normal']}>
      <FlexRow gap="md" className="min-w-0">
        {icon}
        <div className="min-w-0">
          <div className={cn('truncate', prominent && 'font-semibold')}>{label}</div>
          {hint && <div className={cn('text-[12px] text-secondary', prominent ? 'whitespace-normal' : 'truncate')}>{hint}</div>}
        </div>
      </FlexRow>
      {value !== undefined && <div className="shrink-0 text-right text-secondary tabular-nums">{value}</div>}
    </FlexRow>
  );
}

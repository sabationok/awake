import type { ReactNode } from 'react';
import { FlexRow } from './flex';

/**
 * @ui KeyValueRow
 * @spec Рядок групи: іконка, назва ліворуч, значення праворуч. Без значення лишає місце для дії.
 * @keywords row, label value, setting row, list item
 */
interface KeyValueRowProps {
  label: ReactNode;
  value?: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
}

export function KeyValueRow({ label, value, icon, hint }: KeyValueRowProps) {
  return (
    <FlexRow gap="md" justify="between" className="min-h-11 px-4 py-2 text-[15px]">
      <FlexRow gap="md" className="min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="truncate">{label}</div>
          {hint && <div className="truncate text-[12px] text-secondary">{hint}</div>}
        </div>
      </FlexRow>
      {value !== undefined && <div className="shrink-0 text-right text-secondary tabular-nums">{value}</div>}
    </FlexRow>
  );
}

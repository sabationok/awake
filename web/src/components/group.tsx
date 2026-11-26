import type { ReactNode } from 'react';
import { FlexBox, FlexRow } from './flex';

/**
 * @ui Group
 * @spec Згрупована картка macOS: заголовок над нею, рядки з тонкими роздільниками, підпис під нею.
 * trailing — праворуч від заголовка (статус, дії секції).
 * @keywords section, card, inset grouped, settings group, list
 */
interface GroupProps {
  title?: ReactNode;
  footer?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}

export function Group({ title, footer, trailing, children }: GroupProps) {
  return (
    <FlexBox gap="xs">
      {(title || trailing) && (
        <FlexRow gap="sm" justify={title ? 'between' : 'end'} className="px-4">
          {title && <h2 className="text-[13px] font-semibold text-secondary">{title}</h2>}
          {trailing}
        </FlexRow>
      )}
      <div className="overflow-hidden rounded-xl bg-surface shadow-[0_0_0_0.5px_var(--separator)] [&>*+*]:border-t [&>*+*]:border-separator">
        {children}
      </div>
      {footer && <p className="px-4 text-[12px] text-secondary">{footer}</p>}
    </FlexBox>
  );
}

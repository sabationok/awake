import type { ReactNode } from 'react';
import { FlexBox } from './flex';

/**
 * @ui Group
 * @spec Згрупована картка macOS: заголовок над нею, рядки з тонкими роздільниками, підпис під нею.
 * @keywords section, card, inset grouped, settings group, list
 */
interface GroupProps {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Group({ title, footer, children }: GroupProps) {
  return (
    <FlexBox gap="xs">
      {title && <h2 className="px-4 text-[13px] font-semibold text-secondary">{title}</h2>}
      <div className="overflow-hidden rounded-xl bg-surface shadow-[0_0_0_0.5px_var(--separator)] [&>*+*]:border-t [&>*+*]:border-separator">
        {children}
      </div>
      {footer && <p className="px-4 text-[12px] text-secondary">{footer}</p>}
    </FlexBox>
  );
}

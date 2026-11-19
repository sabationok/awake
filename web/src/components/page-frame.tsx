import type { ReactNode } from 'react';
import { FlexBox } from './flex';

/**
 * @ui PageFrame
 * @spec Сторінка: великий заголовок і колонка груп по центру, з відступами під виріз iPhone.
 * @keywords page, frame, container, large title
 */
export function PageFrame({ title, accessory, children }: { title: ReactNode; accessory?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <FlexBox gap="lg">
        <div className="flex items-end justify-between gap-3 px-1">
          <h1 className="text-[32px] font-bold tracking-tight">{title}</h1>
          {accessory}
        </div>
        {children}
      </FlexBox>
    </main>
  );
}

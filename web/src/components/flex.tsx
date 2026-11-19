import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * @ui FlexBox / FlexRow
 * @spec Розкладка без голих div: колонка або рядок з іменованим відступом.
 * @keywords layout, flex, stack, row, column, gap
 */
type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Align = 'start' | 'center' | 'end' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between';

const GAP: Record<Gap, string> = { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-3', lg: 'gap-5', xl: 'gap-8' };
const ALIGN: Record<Align, string> = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' };
const JUSTIFY: Record<Justify, string> = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' };

interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: Align;
  justify?: Justify;
}

export function FlexBox({ gap = 'md', align = 'stretch', justify = 'start', className, ...rest }: FlexProps) {
  return <div className={cn('flex flex-col', GAP[gap], ALIGN[align], JUSTIFY[justify], className)} {...rest} />;
}

export function FlexRow({ gap = 'sm', align = 'center', justify = 'start', className, ...rest }: FlexProps) {
  return <div className={cn('flex flex-row', GAP[gap], ALIGN[align], JUSTIFY[justify], className)} {...rest} />;
}

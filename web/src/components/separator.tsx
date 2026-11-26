/**
 * @ui Separator
 * @spec Роздільна лінія 1px без відступів. З word: лінія — слово — лінія по центру (наприклад «або»).
 * @keywords separator, divider, line, rule, or
 */
interface SeparatorProps {
  word?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ word, orientation = 'horizontal' }: SeparatorProps) {
  if (orientation === 'vertical') return <div aria-hidden className="h-full w-px shrink-0 bg-separator" />;
  if (!word) return <div role="separator" className="h-px w-full bg-separator" />;
  return (
    <div role="separator" className="flex w-full items-center gap-3">
      <span className="h-px flex-1 bg-separator" />
      <span className="text-[13px] text-secondary">{word}</span>
      <span className="h-px flex-1 bg-separator" />
    </div>
  );
}

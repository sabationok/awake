import type { UiText, UiTone } from '@awake/contracts';
import { cn } from '@/lib/cn';
import type { NodeProps } from '../sdui.types';

const TEXT_TONE: Record<UiTone, string> = {
  accent: 'text-accent',
  green: 'text-green',
  orange: 'text-orange',
  red: 'text-red',
  gray: 'text-secondary',
  indigo: 'text-indigo',
  yellow: 'text-yellow',
};

/** Абзац у групі; без тону — основний колір тексту. */
export function TextNode({ node }: NodeProps<UiText>) {
  return <p className={cn('px-4 py-3 text-[15px]', node.tone ? TEXT_TONE[node.tone] : 'text-label')}>{node.text}</p>;
}

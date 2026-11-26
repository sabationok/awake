import type { UiSeparator } from '@awake/contracts';
import { Separator } from '@/components/separator';
import type { NodeProps } from '../sdui.types';

/** Роздільна лінія; з словом — «або» між блоками. */
export function SeparatorNode({ node }: NodeProps<UiSeparator>) {
  return (
    <div className="px-4 py-2">
      <Separator word={node.word} />
    </div>
  );
}

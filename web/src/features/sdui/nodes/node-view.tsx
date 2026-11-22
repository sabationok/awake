import type { ComponentType } from 'react';
import type { UiNode } from '@awake/contracts';
import type { NodeProps } from '../sdui.types';
import { ButtonsNode } from './buttons-node';
import { ChartNode } from './chart-node';
import { ListNode } from './list-node';
import { RowNode } from './row-node';
import { SectionNode } from './section-node';
import { SelectNode } from './select-node';
import { StatusNode } from './status-node';
import { TabsNode } from './tabs-node';
import { SwitchNode } from './switch-node';
import { TextNode } from './text-node';
import { TimerNode } from './timer-node';

type NodeComponents = { [K in UiNode['type']]: ComponentType<NodeProps<Extract<UiNode, { type: K }>>> };

const NODE_COMPONENTS: NodeComponents = {
  section: SectionNode,
  row: RowNode,
  status: StatusNode,
  switch: SwitchNode,
  select: SelectNode,
  buttons: ButtonsNode,
  list: ListNode,
  text: TextNode,
  tabs: TabsNode,
  timer: TimerNode,
  chart: ChartNode,
};

/** Вибирає компонент за типом вузла; рендерер не знає, звідки вузол узявся. */
export function NodeView({ node, onEvent }: NodeProps<UiNode>) {
  const View = NODE_COMPONENTS[node.type] as ComponentType<NodeProps<UiNode>>;
  return <View node={node} onEvent={onEvent} />;
}

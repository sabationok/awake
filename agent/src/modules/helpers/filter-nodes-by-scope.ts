import type { UiNode, UiScope } from '@awake/contracts';
import { isVisibleInScope } from './is-visible-in-scope';

/** Прибирає вузли поза scope; вкладені секції фільтруються рекурсивно. */
export function filterNodesByScope(nodes: UiNode[], scope: UiScope): UiNode[] {
  return nodes
    .filter((node) => isVisibleInScope(node, scope))
    .map((node) => (node.type === 'section' ? { ...node, children: filterNodesByScope(node.children, scope) } : node));
}

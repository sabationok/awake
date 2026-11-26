import type { UiNode, UiScope } from '@awake/contracts';
import { isVisibleInScope } from './is-visible-in-scope';

/** Прибирає вузли поза scope; вкладені секції і вкладки фільтруються рекурсивно (QR зі scope mac не має витекти). */
export function filterNodesByScope(nodes: UiNode[], scope: UiScope): UiNode[] {
  return nodes
    .filter((node) => isVisibleInScope(node, scope))
    .map((node): UiNode => {
      if (node.type === 'section') return { ...node, children: filterNodesByScope(node.children, scope) };
      if (node.type === 'tabs') return { ...node, tabs: node.tabs.map((tab) => ({ ...tab, children: filterNodesByScope(tab.children, scope) })) };
      return node;
    });
}

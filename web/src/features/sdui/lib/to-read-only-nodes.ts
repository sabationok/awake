import type { UiNode } from '@awake/contracts';

/** Вимикає перемикачі, списки і кнопки: на Vercel дерево лише для перегляду. */
export function toReadOnlyNodes(nodes: UiNode[]): UiNode[] {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return { ...node, children: toReadOnlyNodes(node.children) };
      case 'switch':
      case 'select':
        return { ...node, disabled: true };
      case 'buttons':
        return { ...node, buttons: node.buttons.map((button) => ({ ...button, disabled: true })) };
      default:
        return node;
    }
  });
}

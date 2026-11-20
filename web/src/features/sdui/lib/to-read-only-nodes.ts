import type { UiControl, UiNode } from '@awake/contracts';

/** Вимикає перемикачі, списки, кнопки і керування в рядках: на Vercel дерево лише для перегляду. */
export function toReadOnlyNodes(nodes: UiNode[]): UiNode[] {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return { ...node, children: toReadOnlyNodes(node.children) };
      case 'row':
        return node.control ? { ...node, control: disableControl(node.control) } : node;
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

function disableControl(control: UiControl): UiControl {
  if (control.type === 'button') return { ...control, button: { ...control.button, disabled: true } };
  return { ...control, disabled: true };
}

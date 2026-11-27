import type { UiControl, UiMenuItem, UiNode } from '@awake/contracts';

/** Вимикає перемикачі, списки, кнопки, керування і дії в елементах: на Vercel дерево лише для перегляду (як у web). */
export function toReadOnlyNodes(nodes: UiNode[]): UiNode[] {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return { ...node, children: toReadOnlyNodes(node.children), actions: disableActions(node.actions) };
      case 'row':
        return node.control ? { ...node, control: disableControl(node.control) } : node;
      case 'item':
        return {
          ...node,
          control: node.control ? disableControl(node.control) : undefined,
          actions: disableActions(node.actions),
        };
      case 'notice':
        return { ...node, dismiss: undefined };
      case 'tabs':
        return { ...node, tabs: node.tabs.map((tab) => ({ ...tab, children: toReadOnlyNodes(tab.children) })) };
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

function disableActions(actions: UiMenuItem[] | undefined): UiMenuItem[] | undefined {
  return actions?.map((action) => ({ ...action, disabled: true }));
}

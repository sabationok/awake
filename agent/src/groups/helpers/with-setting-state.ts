import type { UiNode } from '@macontrol/contracts';

/** Стан вузла налаштування, який знає лише сторінка: сірий з причиною або з поточним станом у підказці. */
export class SettingNodeState {
  disabled?: boolean;
  hint?: string;
}

/** Вузол налаштування з `ctx.settingNode` плюс стан сторінки. Інший вузол повертається як є. */
export function withSettingState(node: UiNode, state: SettingNodeState): UiNode {
  if (node.type !== 'switch' && node.type !== 'select') return node;
  return { ...node, ...(state.disabled ? { disabled: true } : {}), ...(state.hint !== undefined ? { hint: state.hint } : {}) };
}

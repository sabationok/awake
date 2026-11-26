import type { UiAction, UiActionVariant, UiConfirm, UiControl, UiForm, UiIcon, UiMenuItem, UiNode, UiScope } from '@awake/contracts';

/** Необов'язкові поля пункту дії; variant за замовчуванням default. */
export class MenuItemOptions {
  variant?: UiActionVariant;
  icon?: UiIcon;
  confirm?: UiConfirm;
  form?: UiForm;
  scope?: UiScope;
  hint?: string;
  disabled?: boolean;
}

/**
 * Пункт дії для `item.actions` / `section.actions`. Сторінка кладе в список лише ті пункти, що діють у поточному
 * стані (видано → «Відкликати», ні → «Запит»): клієнт нічого не перевіряє.
 */
export function menuItem(id: string, label: string, action: UiAction, options: MenuItemOptions = {}): UiMenuItem {
  const { variant = 'default', ...rest } = options;
  const item: UiMenuItem = { id, label, action, variant };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) (item as unknown as Record<string, unknown>)[key] = value;
  }
  return item;
}

/**
 * Вузол налаштування з `ctx.settingNode` як керування праворуч у картці (`item.control`): перемикач або вибір
 * пишуть те саме налаштування. Інший вузол керування не має.
 */
export function settingControl(node: UiNode): UiControl | undefined {
  if (node.type === 'switch') {
    return { type: 'switch', value: node.value, setting: { module: node.module, key: node.key }, ...(node.disabled ? { disabled: true } : {}) };
  }
  if (node.type === 'select') {
    return {
      type: 'select',
      value: node.value,
      options: node.options,
      setting: { module: node.module, key: node.key },
      ...(node.disabled ? { disabled: true } : {}),
    };
  }
  return undefined;
}

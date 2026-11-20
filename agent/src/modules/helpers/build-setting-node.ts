import type { SettingDefinition, SettingValue, UiSelect, UiSwitch } from '@awake/contracts';

/** Вузол налаштування на сторінці «Налаштування»; key вузла збігається з UiSettingChange. */
export function buildSettingNode(
  moduleId: string,
  definition: SettingDefinition,
  value: SettingValue,
): UiSwitch | UiSelect {
  const base = {
    id: `${moduleId}.${definition.key}`,
    module: moduleId,
    key: definition.key,
    label: definition.label,
    hint: definition.hint,
    icon: definition.icon,
    scope: definition.scope,
  };
  if (definition.type === 'switch') {
    return { ...base, type: 'switch', value: value === true };
  }
  return { ...base, type: 'select', value: String(value), options: definition.options };
}

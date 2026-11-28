import { defineBind } from '@macontrol/contracts';
import type { SettingDefinition, SettingValue, UiSelect, UiSwitch } from '@macontrol/contracts';

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
    // Значення ще й зі стейту (`modules.<module>.<key>`): перемикач міняється з патчем, не чекаючи сторінки.
    const bind = defineBind('switch', `modules.${moduleId}.${definition.key}`, { true: 'on', false: 'off' }, 'off');
    return { ...base, type: 'switch', value: value === true, bind };
  }
  return { ...base, type: 'select', value: String(value), options: definition.options };
}

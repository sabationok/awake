import type { SettingDefinition, SettingValue } from '@awake/contracts';

/** Тип значення відповідає опису: bool для switch, один із варіантів для select. */
export function isValidSettingValue(definition: SettingDefinition, value: SettingValue): boolean {
  switch (definition.type) {
    case 'switch':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && definition.options.some((option) => option.value === value);
  }
}

import type { SettingDefinition, SettingValue } from '@awake/contracts';
import { isValidSettingValue } from './is-valid-setting-value';

/** Збережене значення або default, якщо його немає чи воно більше не відповідає опису. */
export function resolveSettingValue(definition: SettingDefinition, stored: SettingValue | undefined): SettingValue {
  return stored !== undefined && isValidSettingValue(definition, stored) ? stored : definition.default;
}

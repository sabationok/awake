import type { SettingValue } from '@awake/contracts';
import { NO_DEVICE, PROXIMITY_DELAY_OPTIONS, PROXIMITY_RANGE_OPTIONS, PROXIMITY_WHEN_OPTIONS } from '../../../constants/proximity-settings';
import type { ProximityConfig, ProximityWhen } from '../../../types/proximity-state.types';

const pick = (value: SettingValue | undefined, options: { value: string }[], fallback: string) =>
  typeof value === 'string' && options.some((option) => option.value === value) ? value : fallback;

/** Налаштування «Поруч» із SQLite, з default і перевіркою, у числах для рішення. */
export function readProximityConfig(get: (key: string) => SettingValue | undefined): ProximityConfig {
  const device = get('device');
  return {
    enabled: get('enabled') === true,
    device: typeof device === 'string' ? device : NO_DEVICE,
    range: Number(pick(get('range'), PROXIMITY_RANGE_OPTIONS, '-75')),
    delayMs: Number(pick(get('delay'), PROXIMITY_DELAY_OPTIONS, '10')) * 1000,
    when: pick(get('when'), PROXIMITY_WHEN_OPTIONS, 'session') as ProximityWhen,
  };
}

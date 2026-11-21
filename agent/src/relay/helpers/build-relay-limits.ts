import { RELAY_LIMIT_DEFAULT, RELAY_LIMIT_KEYS } from '../constants/relay-settings';

/** Частина RelayLimitsDef, яку задають select-и: `limits.viewerSend.queueSize = '20'` → `{ viewerSend: { queueSize: 20 } }`. */
export type RelayLimitsOverride = Record<string, number | Record<string, number>>;

export function buildRelayLimits(read: (key: string) => string): RelayLimitsOverride {
  const limits: RelayLimitsOverride = {};
  for (const key of RELAY_LIMIT_KEYS) {
    const value = read(key);
    if (value === RELAY_LIMIT_DEFAULT) continue;
    const [, field, nested] = key.split('.');
    if (nested) limits[field] = { ...((limits[field] as Record<string, number>) ?? {}), [nested]: Number(value) };
    else limits[field] = Number(value);
  }
  return limits;
}

import type { MacState } from '@awake/contracts';
import type { StatusFields } from '../../types/mac-module';

/** Поля системного модуля в спільному /status. */
export function macStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return {
    sleepBlocked: mac.sleepBlocked,
    battery: mac.battery === null ? null : `${mac.battery}%`,
    power: mac.power,
    thermal: mac.thermal,
    lidClosed: mac.lidClosed,
  };
}

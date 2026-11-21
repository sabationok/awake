import type { MacState } from '@awake/contracts';
import type { StatusFields } from '../../types/mac-module';

/** Поля «Екран і звук» у спільному /status. */
export function mediaStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { volume: mac.volume, muted: mac.muted, brightness: mac.brightness };
}

import type { MacState } from '@macontrol/contracts';
import type { StatusFields } from '../../types/mac-module';

/** /status → `media`. */
export function mediaStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { volume: mac.volume, muted: mac.muted, brightness: mac.brightness };
}

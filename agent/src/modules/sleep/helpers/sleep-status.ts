import type { MacState } from '@awake/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import type { StatusFields } from '../../types/mac-module';

/** Поля таймера в спільному /status. */
export function sleepStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { sleepAt: mac.sleepAt ? formatHhmm(mac.sleepAt) : null };
}

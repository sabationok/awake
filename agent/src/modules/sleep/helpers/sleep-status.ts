import type { MacState } from '@awake/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import type { StatusFields } from '../../types/mac-module';

/** /status → `sleep`: лише поки йде таймер. */
export function sleepStatus(mac: MacState | null): StatusFields | null {
  if (!mac?.sleepAt) return null;
  return {
    startedAt: mac.sleepStartedAt ? formatHhmm(mac.sleepStartedAt) : null,
    sleepAt: formatHhmm(mac.sleepAt),
  };
}

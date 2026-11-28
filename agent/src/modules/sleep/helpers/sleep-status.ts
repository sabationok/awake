import type { MacState } from '@macontrol/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import { formatDurationId } from '../../helpers/format-duration-id';
import type { StatusFields } from '../../types/mac-module';

/** /status → `sleep`: лише поки йде таймер; ті самі поля, що й в `awake`. */
export function sleepStatus(mac: MacState | null): StatusFields | null {
  if (!mac?.sleepAt) return null;
  const startedAt = mac.sleepStartedAt;
  return {
    startedAt: startedAt ? formatHhmm(startedAt) : null,
    until: formatHhmm(mac.sleepAt),
    duration: startedAt ? formatDurationId(Date.parse(mac.sleepAt) - Date.parse(startedAt)) : null,
  };
}

import type { MacState } from '@macontrol/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import type { StatusFields } from '../../types/mac-module';

/** /status → `awake`: лише поки йде сесія. Стан Mac пише системний модуль. */
export function awakeStatus(mac: MacState | null): StatusFields | null {
  if (!mac?.active) return null;
  return {
    startedAt: mac.startedAt ? formatHhmm(mac.startedAt) : null,
    until: mac.until ? formatHhmm(mac.until) : null,
    duration: mac.duration,
  };
}

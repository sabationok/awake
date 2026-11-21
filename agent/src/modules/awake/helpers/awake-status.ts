import type { MacState } from '@awake/contracts';
import { formatHhmm } from '../../../common/format-hhmm';
import type { StatusFields } from '../../types/mac-module';

/** Поля Awake у спільному /status: лише сесія. Стан Mac пише системний модуль. */
export function awakeStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return {
    awake: mac.active,
    until: mac.until ? formatHhmm(mac.until) : null,
    duration: mac.duration,
  };
}

import type { UiRow } from '@awake/contracts';
import type { SessionsPeriod } from '../../../sessions/types/sessions-history.types';
import { formatDuration } from '../../helpers/format-duration';

/** Як підписати початок періоду: день (локальний), тиждень, місяць (UTC-бакети). */
export type SessionsPeriodLabel = 'day' | 'week' | 'month';

const LABELS: Record<SessionsPeriodLabel, (start: Date) => string> = {
  day: (start) => start.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' }),
  week: (start) => {
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', timeZone: 'UTC' };
    return `${start.toLocaleDateString('uk-UA', opts)} – ${end.toLocaleDateString('uk-UA', opts)}`;
  },
  month: (start) => start.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
};

/** Рядок таймлайну: «3 сесії · 4 год 10 хв», у підказці — середня тривалість. */
export function sessionsPeriodRow(period: SessionsPeriod, label: SessionsPeriodLabel): UiRow {
  const ms = period.seconds * 1000;
  return {
    id: `${label}-${period.start.toISOString()}`,
    type: 'row',
    label: LABELS[label](period.start),
    value: period.count || period.seconds ? `${period.count} · ${formatDuration(ms)}` : '—',
    hint: period.count ? `у середньому ${formatDuration(ms / period.count)}` : undefined,
  };
}

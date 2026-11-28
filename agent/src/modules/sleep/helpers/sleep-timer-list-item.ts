import type { SleepTimerRecord, UiList } from '@macontrol/contracts';
import { formatClock } from '../../helpers/format-clock';
import { formatSessionStart } from '../../helpers/format-session-start';
import { sessionSourceLabel } from '../../helpers/session-source-label';

/** Рядок історії таймерів: коли поставили, на скільки, звідки і чим скінчився. */
export function sleepTimerListItem(timer: SleepTimerRecord): UiList['items'][number] {
  const end = timer.endReason ?? (timer.endedAt ? null : `засне о ${formatClock(timer.sleepAt)}`);
  return {
    id: String(timer.id),
    label: formatSessionStart(timer.startedAt),
    hint: [sessionSourceLabel(timer.source), end].filter((part): part is string => part !== null).join(' · '),
    value: `${timer.minutes} хв`,
  };
}

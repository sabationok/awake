import type { SleepTimerRecord, UiPage } from '@awake/contracts';
import { SLEEP_HISTORY_LIMIT } from '../constants/sleep-limits';
import { sleepTimerListItem } from '../helpers/sleep-timer-list-item';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** «Історія таймерів»: скільки разів за тиждень Mac заснув за таймером, і список сесій. */
export function buildHistoryPage(timers: SleepTimerRecord[], now: Date): UiPage {
  const week = timers.filter((timer) => new Date(timer.startedAt).getTime() >= now.getTime() - WEEK_MS);
  const slept = week.filter((timer) => timer.endReason === 'Mac заснув').length;
  return {
    id: 'sleep-history',
    module: 'sleep',
    title: 'Історія таймерів',
    icon: { symbol: 'clock.arrow.circlepath', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'week',
        type: 'section',
        title: 'За 7 днів',
        children: [
          { id: 'count', type: 'row', label: 'Таймерів', value: String(week.length) },
          { id: 'slept', type: 'row', label: 'Mac заснув', value: String(slept) },
        ],
      },
      {
        id: 'history',
        type: 'section',
        title: 'Історія',
        children: [
          {
            id: 'timers',
            type: 'list',
            items: timers.slice(0, SLEEP_HISTORY_LIMIT).map(sleepTimerListItem),
            empty: 'Ще не було жодного таймера',
          },
        ],
      },
    ],
  };
}

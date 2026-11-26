import type { SleepTimerRecord, UiPage } from '@awake/contracts';
import { SLEEP_HISTORY_LIMIT } from '../constants/sleep-limits';
import { sleepTimerListItem } from '../helpers/sleep-timer-list-item';

/** «Історія таймерів»: лише список; підсумки й графіки — на «Трекінгу». */
export function buildHistoryPage(timers: SleepTimerRecord[]): UiPage {
  return {
    id: 'sleep-history',
    module: 'sleep',
    title: 'Історія таймерів',
    icon: { symbol: 'clock.arrow.circlepath', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'history',
        type: 'section',
        title: `Останні ${SLEEP_HISTORY_LIMIT}`,
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

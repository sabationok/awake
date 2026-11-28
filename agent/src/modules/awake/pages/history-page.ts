import type { SessionRecord, UiPage } from '@macontrol/contracts';
import { TRACKING_HISTORY_LIMIT } from '../constants/session-limits';
import { AWAKE_HISTORY_PAGE } from '../constants/awake-pages';
import { sessionListItem } from '../helpers/session-list-item';

/** «Історія сесій»: список останніх сесій, окремо від графіків трекінгу. */
export function buildAwakeHistoryPage(sessions: SessionRecord[], now: Date): UiPage {
  return {
    id: AWAKE_HISTORY_PAGE,
    module: 'awake',
    title: 'Історія сесій',
    icon: { symbol: 'clock.arrow.circlepath', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'history',
        type: 'section',
        title: `Останні ${TRACKING_HISTORY_LIMIT}`,
        children: [
          {
            id: 'sessions',
            type: 'list',
            items: sessions.map((session) => sessionListItem(session, now)),
            empty: 'Ще не було жодної сесії',
          },
        ],
      },
    ],
  };
}

import type { UiPage } from '@awake/contracts';
import { RELAY_SESSIONS_PAGE } from '../constants/relay-settings';
import { relaySessionListItem } from '../helpers/relay-session-list-item';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/** «Сесії»: viewer-и, що підключались до кімнати webhooxy. */
export function buildRelaySessionsPage(state: RelayStateSnapshot): UiPage {
  return {
    id: RELAY_SESSIONS_PAGE,
    module: 'relay',
    title: 'Сесії',
    icon: { symbol: 'person.2.fill', tone: 'accent' },
    group: 'modules',
    // Webhooxy налаштовують лише в SwiftUI: Web UI, що йде через нього, сам його не крутить.
    scope: 'mac',
    children: [
      {
        id: 'sessions',
        type: 'section',
        title: 'Сесії',
        children: [
          { id: 'viewers', type: 'list', items: state.viewers.map(relaySessionListItem), empty: 'Ще ніхто не підключався' },
        ],
      },
    ],
  };
}

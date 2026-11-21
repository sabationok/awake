import type { UiPage } from '@awake/contracts';
import { RELAY_PAGE } from '../constants/relay-settings';
import { relayConnectionNodes } from '../helpers/relay-connection-nodes';
import { RELAY_STATUS_VIEW } from '../helpers/relay-status-label';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/**
 * Головна вкладка Webhooxy: стан host-а і з чим він підключається. Ліміти, трекінг і сесії — дочірні вкладки; сповіщення — Telegram → Сповіщення.
 * Чи пускати дашборд через webhooxy, вирішує Агент: перемикач на його Огляді.
 */
export function buildRelayPage(state: RelayStateSnapshot): UiPage {
  const view = RELAY_STATUS_VIEW[state.status];
  return {
    id: RELAY_PAGE,
    module: 'relay',
    title: 'Webhooxy',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    group: 'modules',
    // Webhooxy налаштовують лише в SwiftUI: дашборд, що йде через нього, сам його не крутить.
    scope: 'mac',
    children: [
      {
        id: 'host',
        type: 'section',
        title: 'Host',
        footer: 'Проксі до вебдашборду: агент тримає кімнату в webhooxy, дашборд підключається до неї за квитком. Увімкнути — Агент → Огляд або /relay у Telegram.',
        children: [
          { id: 'status', type: 'status', label: view.label, tone: view.tone, pulse: state.status === 'connecting', hint: state.reason ?? undefined },
          { id: 'viewers', type: 'row', label: 'Сесій зараз', value: String(state.viewers.length) },
        ],
      },
      ...(state.connection
        ? [
            {
              id: 'connection',
              type: 'section' as const,
              title: 'Підключення',
              footer: `Ключі — у ${state.connection.envPath} або в process.env (Envify має пріоритет). Агент читає їх на старті; секрети тут не показуються.`,
              children: relayConnectionNodes(state.connection),
            },
          ]
        : []),
    ],
  };
}

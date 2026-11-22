import type { UiNode, UiPage } from '@awake/contracts';
import { RELAY_PAGE } from '../constants/relay-settings';
import { relayConnectionNodes } from '../helpers/relay-connection-nodes';
import { RELAY_STATUS_VIEW } from '../helpers/relay-status-label';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/**
 * Головна вкладка Webhooxy: стан host-а, URL і зауваги про ключі. Самі ключі — нативна форма SwiftUI над цією сторінкою. Ліміти, трекінг і сесії — дочірні вкладки; сповіщення — Telegram → Сповіщення.
 * Перемикач модуля — тут; через що з нього йде дашборд (Tailscale чи webhooxy), вибирають на Огляді Агента.
 */
export function buildRelayPage(state: RelayStateSnapshot, enabledNode: UiNode): UiPage {
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
        footer: 'Проксі до вебдашборду: агент тримає кімнату в webhooxy, дашборд підключається до неї за квитком. Працює, коли модуль увімкнено і на Огляді Агента вибрано «Webhooxy».',
        children: [
          enabledNode,
          { id: 'status', type: 'status', label: view.label, tone: view.tone, pulse: state.status === 'connecting', hint: state.reason ?? undefined },
          { id: 'viewers', type: 'row', label: 'Сесій зараз', value: String(state.viewers.length) },
          ...(state.connection ? relayConnectionNodes(state.connection) : []),
        ],
      },
    ],
  };
}

import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { RELAY_STATUS_VIEW } from '../helpers/relay-status-label';
import { relaySessionListItem } from '../helpers/relay-session-list-item';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/**
 * Сторінка relay лише в SwiftUI: перемикач, стан host-а і сесії viewer-ів. Relay — проксі до нашого бота,
 * тож сторінка стоїть у сайдбарі під Bot (`module: 'bot'`); налаштування лишаються модуля relay (ctx).
 */
export function buildRelayPage(ctx: ModuleContext, state: RelayStateSnapshot): UiPage {
  const view = RELAY_STATUS_VIEW[state.status];
  return {
    id: 'relay',
    module: 'bot',
    title: 'Relay',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'host',
        type: 'section',
        title: 'Host',
        footer: 'Агент тримає кімнату в webhooxy, дашборд підключається до неї за квитком. Вимкнути можна й з Telegram: /relay.',
        children: [
          ctx.settingNode('enabled'),
          { id: 'status', type: 'status', label: view.label, tone: view.tone, pulse: state.status === 'connecting', hint: state.reason ?? undefined },
        ],
      },
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

import type { UiNode, UiPage } from '@awake/contracts';
import type { BotMetrics } from '../../bot-journal';
import type { ModuleContext } from '../../modules/types/mac-module';
import { RELAY_NOTIFICATIONS } from '../constants/relay-notifications';
import { RELAY_METRICS } from '../constants/relay-metrics';
import { RELAY_LIMIT_KEYS, RELAY_PAGE } from '../constants/relay-settings';
import { effectiveLimit } from '../helpers/effective-limit';
import { RELAY_STATUS_VIEW } from '../helpers/relay-status-label';
import { relaySessionListItem } from '../helpers/relay-session-list-item';
import type { RelayStateSnapshot } from '../types/relay-status.types';

const TRACKING: { metric: string; label: string }[] = [
  { metric: 'src.relay', label: 'Дій через webhooxy' },
  { metric: RELAY_METRICS.messages, label: 'Повідомлень від viewer-ів' },
  { metric: RELAY_METRICS.viewerAllowed, label: 'Viewer-ів пущено' },
  { metric: RELAY_METRICS.viewerDenied, label: 'Viewer-ів не пущено' },
  { metric: RELAY_METRICS.connects, label: 'Підключень host-а' },
  { metric: RELAY_METRICS.errors, label: 'Помилок' },
];

/** Select ліміту з тим, що реально діє у webhooxy, у підказці. */
function limitNode(ctx: ModuleContext, key: string, state: RelayStateSnapshot): UiNode {
  const node = ctx.settingNode(key);
  const effective = effectiveLimit(state.limits.effective, key);
  return effective === null ? node : ({ ...node, hint: `Діє: ${effective}` } as UiNode);
}

/**
 * Модуль Webhooxy лише в SwiftUI: стан host-а, ліміти кімнати, трекінг, сповіщення і сесії viewer-ів.
 * Чи пускати дашборд через webhooxy, вирішує Агент: перемикач на його Огляді.
 */
export function buildRelayPage(ctx: ModuleContext, state: RelayStateSnapshot, metrics: BotMetrics): UiPage {
  const view = RELAY_STATUS_VIEW[state.status];
  const { limits } = state;
  return {
    id: RELAY_PAGE,
    module: 'relay',
    title: 'Webhooxy',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'host',
        type: 'section',
        title: 'Host',
        footer: 'Агент тримає кімнату в webhooxy, дашборд підключається до неї за квитком. Увімкнути — Агент → Огляд або /relay у Telegram.',
        children: [
          { id: 'status', type: 'status', label: view.label, tone: view.tone, pulse: state.status === 'connecting', hint: state.reason ?? undefined },
        ],
      },
      {
        id: 'limits',
        type: 'section',
        title: 'Ліміти кімнати',
        footer: limits.error
          ? `webhooxy не прийняв останні ліміти (${limits.error}); діють попередні.`
          : 'Діють одразу, без перепідключення. «Як у webhooxy» — поле не передається.',
        children: RELAY_LIMIT_KEYS.map((key) => limitNode(ctx, key, state)),
      },
      {
        id: 'tracking',
        type: 'section',
        title: 'Трекінг',
        footer: 'Сьогодні / усього.',
        children: TRACKING.map(({ metric, label }) => ({
          id: `track-${metric}`,
          type: 'row',
          label,
          value: `${metrics.today[metric] ?? 0} / ${metrics.total[metric] ?? 0}`,
        })),
      },
      {
        id: 'notifications',
        type: 'section',
        title: 'Сповіщення в Telegram',
        children: RELAY_NOTIFICATIONS.events.map((event) => ctx.settingNode(`events.relay.${event.type}`, 'telegram')),
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

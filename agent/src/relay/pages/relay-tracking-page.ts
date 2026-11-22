import type { UiPage } from '@awake/contracts';
import type { StatCounters } from '@awake/contracts';
import { RELAY_METRICS } from '../constants/relay-metrics';
import { RELAY_PROXY_ID } from '../constants/relay-proxy';
import { RELAY_TRACKING_PAGE } from '../constants/relay-settings';

const TRACKING: { metric: string; label: string }[] = [
  { metric: `proxy.${RELAY_PROXY_ID}`, label: 'Дій через webhooxy' },
  { metric: RELAY_METRICS.messages, label: 'Повідомлень від viewer-ів' },
  { metric: RELAY_METRICS.viewerAllowed, label: 'Viewer-ів пущено' },
  { metric: RELAY_METRICS.viewerDenied, label: 'Viewer-ів не пущено' },
  { metric: RELAY_METRICS.connects, label: 'Підключень host-а' },
  { metric: RELAY_METRICS.errors, label: 'Помилок' },
];

/** «Трекінг»: дії через webhooxy з журналу бота і лічильники вебхука relay. */
export function buildRelayTrackingPage(metrics: StatCounters): UiPage {
  return {
    id: RELAY_TRACKING_PAGE,
    module: 'relay',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    // Webhooxy налаштовують лише в SwiftUI: дашборд, що йде через нього, сам його не крутить.
    scope: 'mac',
    children: [
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
    ],
  };
}

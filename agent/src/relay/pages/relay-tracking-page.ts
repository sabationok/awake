import type { UiChartPoint, UiPage, UiTone } from '@awake/contracts';
import { asStatsPeriod, STATS_PERIOD_KEY, type StatsPeriodWindow } from '../../stats';
import type { ModuleContext } from '../../modules/types/mac-module';
import { RELAY_METRICS } from '../constants/relay-metrics';
import { RELAY_TRACKING_PAGE } from '../constants/relay-settings';

/** Точки графіка трекінгу: `actions` — дії через webhooxy (журнал бота), решта — події вебхука relay (подія → серія). */
export interface RelayTrackingPoints {
  actions(window: StatsPeriodWindow): UiChartPoint[];
  events(window: StatsPeriodWindow, labels: Record<string, string>): UiChartPoint[];
}

/** Графіки подій вебхука: одна подія — одна серія, кілька — stacked з кольором на кожну. */
const EVENT_CHARTS: { id: string; title: string; series: { metric: string; label: string; tone: UiTone }[] }[] = [
  { id: 'messages', title: 'Повідомлень від viewer-ів', series: [{ metric: RELAY_METRICS.messages, label: '', tone: 'accent' }] },
  {
    id: 'viewers',
    title: 'Viewer-и',
    series: [
      { metric: RELAY_METRICS.viewerAllowed, label: 'Пущено', tone: 'green' },
      { metric: RELAY_METRICS.viewerDenied, label: 'Не пущено', tone: 'orange' },
    ],
  },
  { id: 'connects', title: 'Підключень host-а', series: [{ metric: RELAY_METRICS.connects, label: '', tone: 'indigo' }] },
  { id: 'errors', title: 'Помилок', series: [{ metric: RELAY_METRICS.errors, label: '', tone: 'red' }] },
];

/** «Трекінг»: дії через webhooxy з журналу бота і події вебхука relay графіками за вибраний період. */
export function buildRelayTrackingPage(ctx: ModuleContext, points: RelayTrackingPoints): UiPage {
  const period = asStatsPeriod(ctx.setting<string>(STATS_PERIOD_KEY));
  return {
    id: RELAY_TRACKING_PAGE,
    module: 'relay',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    // Webhooxy налаштовують лише в SwiftUI: Web UI, що йде через нього, сам його не крутить.
    scope: 'mac',
    children: [
      { id: 'period', type: 'section', children: [ctx.settingNode(STATS_PERIOD_KEY)] },
      {
        id: 'tracking',
        type: 'section',
        title: 'Трекінг',
        children: [
          ctx.liveChart({ id: `${RELAY_TRACKING_PAGE}-actions`, title: 'Дій через webhooxy', period, tone: 'accent', format: 'count', points: (window) => points.actions(window) }),
          ...EVENT_CHARTS.map(({ id, title, series }) => {
            const labels = Object.fromEntries(series.map(({ metric, label }) => [metric, label]));
            const tones = series.length > 1 ? Object.fromEntries(series.map(({ label, tone }) => [label, tone])) : undefined;
            return ctx.liveChart({
              id: `${RELAY_TRACKING_PAGE}-${id}`,
              title,
              period,
              ...(tones ? { tones } : { tone: series[0].tone }),
              format: 'count',
              points: (window) => points.events(window, labels),
            });
          }),
        ],
      },
    ],
  };
}

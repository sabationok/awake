import type { UiChartPoint, UiPage, UiTone } from '@awake/contracts';
import { buildStatsPage, type StatsPageChart } from '../../modules/helpers/build-stats-page';
import type { StatsPeriodWindow } from '../../stats';
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

/** «Трекінг»: спільний лейаут статистики — дії через webhooxy з журналу бота і події вебхука relay. */
export function buildRelayTrackingPage(ctx: ModuleContext, points: RelayTrackingPoints): UiPage {
  return buildStatsPage(ctx, {
    id: RELAY_TRACKING_PAGE,
    module: 'relay',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    // Webhooxy налаштовують лише в SwiftUI: Web UI, що йде через нього, сам його не крутить.
    scope: 'mac',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: [
          { id: 'actions', title: 'Дій через webhooxy', tone: 'accent', format: 'count', total: true, points: (window) => points.actions(window) },
          ...EVENT_CHARTS.map(({ id, title, series }): StatsPageChart => {
            const labels = Object.fromEntries(series.map(({ metric, label }) => [metric, label]));
            const tones = series.length > 1 ? Object.fromEntries(series.map(({ label, tone }) => [label, tone])) : undefined;
            return {
              id,
              title,
              ...(tones ? { tones } : { tone: series[0].tone }),
              format: 'count',
              total: true,
              points: (window) => points.events(window, labels),
            };
          }),
        ],
      },
    ],
  });
}

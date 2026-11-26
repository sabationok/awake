import type { UiChartPoint, UiPage } from '@awake/contracts';
import { buildStatsPage } from '../../helpers/build-stats-page';
import { formatDuration } from '../../helpers/format-duration';
import type { ModuleContext } from '../../types/mac-module';
import type { StatsPeriodWindow } from '../../../stats';
import { AWAKE_TRACKING_PAGE } from '../constants/awake-pages';

/** Точки трекінгу Awake: кількість сесій і секунди без сну (SessionsService.chartPoints). */
export type AwakeTrackingPoints = (kind: 'count' | 'seconds', window: StatsPeriodWindow) => UiChartPoint[];

/** «Трекінг» Awake: спільний лейаут статистики — вкладки періоду, підсумок, графіки сесій і часу. */
export function buildTrackingPage(ctx: ModuleContext, points: AwakeTrackingPoints): UiPage {
  return buildStatsPage(ctx, {
    id: AWAKE_TRACKING_PAGE,
    module: 'awake',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.xaxis', tone: 'accent' },
    footer: 'Час — лише закритих сесій, розкладений по годинах, у які Mac справді не спав. Дні, тижні й місяці — за UTC.',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: [
          { id: 'count', title: 'Сесій', tone: 'accent', format: 'count', total: true, points: (window) => points('count', window) },
          { id: 'time', title: 'Час', tone: 'green', format: 'duration', total: 'Разом', points: (window) => points('seconds', window) },
        ],
      },
    ],
    summary: (totals) => [
      {
        id: 'average',
        type: 'row',
        label: 'У середньому',
        value: totals.count > 0 ? formatDuration((totals.time / totals.count) * 1000) : '—',
      },
    ],
  });
}

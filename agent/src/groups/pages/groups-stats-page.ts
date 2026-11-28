import type { StatTimeline, UiPage } from '@awake/contracts';
import { buildStatsCharts } from '../../modules/helpers/build-stats-charts';
import { buildStatsPage } from '../../modules/helpers/build-stats-page';
import type { ModuleContext } from '../../modules/types/mac-module';
import type { StatsPeriodWindow } from '../../stats';
import { GROUPS_MODULE } from '../constants/groups-module';
import { GROUPS_UI_STATS } from '../constants/groups-stats';

/** Групи → Статистика: спільний лейаут, графіки з декларації `GROUPS_UI_STATS`. Без адмін-дій, тож scope `all`. */
export function buildGroupsStatsPage(ctx: ModuleContext, timeline: (namespace: string, window: StatsPeriodWindow) => StatTimeline): UiPage {
  return buildStatsPage(ctx, {
    id: GROUPS_UI_STATS.page,
    module: GROUPS_MODULE,
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    scope: 'all',
    periodKey: GROUPS_UI_STATS.filters.period,
    footer: 'Лічильники доставки в групу з дозволом; сповіщення в приватний чат — Telegram → Статистика.',
    sections: [{ id: 'charts', title: 'Графіки', charts: buildStatsCharts(GROUPS_UI_STATS, timeline) }],
  });
}

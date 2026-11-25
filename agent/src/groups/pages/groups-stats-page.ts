import type { StatTimeline, UiPage } from '@awake/contracts';
import { buildStatsCharts } from '../../modules/helpers/build-stats-charts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { asStatsPeriod, type StatsPeriodWindow } from '../../stats';
import { GROUPS_MODULE } from '../constants/groups-module';
import { GROUPS_UI_STATS } from '../constants/groups-stats';

/** Групи → Статистика: графіки з декларації `GROUPS_UI_STATS` за вибраний період. Без адмін-дій, тож scope `all`. */
export function buildGroupsStatsPage(ctx: ModuleContext, timeline: (namespace: string, window: StatsPeriodWindow) => StatTimeline): UiPage {
  const period = asStatsPeriod(ctx.setting<string>(GROUPS_UI_STATS.filters.period));
  return {
    id: GROUPS_UI_STATS.page,
    module: GROUPS_MODULE,
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    scope: 'all',
    children: [
      { id: `${GROUPS_UI_STATS.page}-period`, type: 'section', children: [ctx.settingNode(GROUPS_UI_STATS.filters.period)] },
      {
        id: `${GROUPS_UI_STATS.page}-charts`,
        type: 'section',
        title: 'Статистика',
        footer: 'Лічильники доставки в прив\'язану групу; сповіщення в приватний чат — Telegram → Статистика.',
        children: buildStatsCharts(ctx, GROUPS_UI_STATS, period, timeline),
      },
    ],
  };
}

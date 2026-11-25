import type { StatsPeriod, StatTimeline, UiChart } from '@awake/contracts';
import { counterChartPoints, type StatsPeriodWindow } from '../../stats';
import type { ModuleContext } from '../types/mac-module';
import type { UiModuleStats } from '../types/ui-module-stats';

/**
 * Графіки сторінки статистики з декларації модуля: серії, підписи й кольори беруться з ключів namespace-у, а не
 * з коду сторінки. `timeline` читає namespace за вікно (StatsService.timeline) — єдине, що сторінка дає сама.
 */
export function buildStatsCharts(
  ctx: ModuleContext,
  stats: UiModuleStats,
  period: StatsPeriod,
  timeline: (namespace: string, window: StatsPeriodWindow) => StatTimeline,
): UiChart[] {
  return stats.charts.map((chart) => {
    const namespace = stats.namespaces.find((item) => item.id === chart.namespace);
    const declared = (chart.by === 'value' ? namespace?.values : namespace?.statuses) ?? [];
    const keys = declared.filter((item) => chart.keys === undefined || chart.keys.includes(item.key));
    const labels = Object.fromEntries(keys.map((item) => [item.key, item.label]));
    return ctx.liveChart({
      id: chart.id,
      title: chart.title,
      period,
      format: chart.format,
      tones: Object.fromEntries(keys.map((item) => [item.label, item.tone])),
      points: (window) => counterChartPoints(timeline(chart.namespace, window), chart.by, labels),
    });
  });
}

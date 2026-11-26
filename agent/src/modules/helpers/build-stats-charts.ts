import type { StatTimeline } from '@awake/contracts';
import { counterChartPoints, type StatsPeriodWindow } from '../../stats';
import type { UiModuleStats } from '../types/ui-module-stats';
import type { StatsPageChart } from './build-stats-page';

/**
 * Графіки сторінки статистики з декларації модуля (для `buildStatsPage`): серії, підписи й кольори беруться з
 * ключів namespace-у, а не з коду сторінки. `timeline` читає namespace за вікно (StatsService.timeline).
 */
export function buildStatsCharts(stats: UiModuleStats, timeline: (namespace: string, window: StatsPeriodWindow) => StatTimeline): StatsPageChart[] {
  return stats.charts.map((chart) => {
    const namespace = stats.namespaces.find((item) => item.id === chart.namespace);
    const declared = (chart.by === 'value' ? namespace?.values : namespace?.statuses) ?? [];
    const keys = declared.filter((item) => chart.keys === undefined || chart.keys.includes(item.key));
    const labels = Object.fromEntries(keys.map((item) => [item.key, item.label]));
    return {
      id: chart.id.startsWith(`${stats.page}-`) ? chart.id.slice(stats.page.length + 1) : chart.id,
      title: chart.title,
      format: chart.format,
      tones: Object.fromEntries(keys.map((item) => [item.label, item.tone])),
      total: chart.format === 'count' || chart.format === 'duration',
      points: (window) => counterChartPoints(timeline(chart.namespace, window), chart.by, labels),
    };
  });
}

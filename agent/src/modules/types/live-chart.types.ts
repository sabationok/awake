import type { UiChart, UiChartPoint } from '@macontrol/contracts';
import type { StatsChartPeriod, StatsPeriodWindow } from '../../stats';

/**
 * Графік сторінки, відкритої в Mac: опис вузла, період і функція точок для довільного вікна. Сторінка будує
 * через неї все вікно періоду, LiveChartsService — лише поточний бакет для тіка.
 */
export interface LiveChartSpec extends Omit<UiChart, 'type' | 'unit' | 'points'> {
  period: StatsChartPeriod;
  points(window: StatsPeriodWindow): UiChartPoint[];
}

/** Графіки одного збирання: ключ — id вузла `chart` (у модулі) або id рядка (сторінка, відкрита в Mac) → опис. */
export type LiveChartRegistry = Map<string, LiveChartSpec>;

import type { StatsPeriod, UiChart, UiChartPoint } from '@awake/contracts';
import type { StatsPeriodWindow } from '../../stats';

/**
 * Графік сторінки, що живе в дереві Mac: опис вузла, період і функція точок для довільного вікна. Сторінка будує
 * через неї все вікно періоду, LiveChartsService — лише поточний бакет для тіка.
 */
export interface LiveChartSpec extends Omit<UiChart, 'type' | 'unit' | 'points'> {
  period: StatsPeriod;
  points(window: StatsPeriodWindow): UiChartPoint[];
}

/** Графіки одного збирання дерева: id вузла `chart` → опис. */
export type LiveChartRegistry = Map<string, LiveChartSpec>;

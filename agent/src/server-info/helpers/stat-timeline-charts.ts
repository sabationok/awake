import type { StatTimeline, UiChartPoint } from '@awake/contracts';
import { statGaugeAverage } from '../../stats';

/** Середнє заміру `value` по бакетах; бакет без замірів — 0, щоб вісь лишалась суцільною. */
export function gaugeChartPoints(timeline: StatTimeline, value: string, scale = 1): UiChartPoint[] {
  return timeline.points.map((point) => ({ start: point.periodStart, value: (statGaugeAverage(point.metrics, value) ?? 0) * scale }));
}

/**
 * Лічильник, складений по одному виміру: `by: 'value'` — серія на кожне значення (шлях запиту), статуси складено;
 * `by: 'status'` — серія на кожен статус (клас відповіді), значення складено. `labels` — назви серій; чого там немає,
 * того не показуємо.
 */
export function counterChartPoints(timeline: StatTimeline, by: 'value' | 'status', labels: Record<string, string>): UiChartPoint[] {
  return timeline.points.flatMap((point) => {
    const sums = new Map<string, number>();
    for (const [value, statuses] of Object.entries(point.metrics)) {
      for (const [status, count] of Object.entries(statuses)) {
        const key = by === 'value' ? value : status;
        if (key in labels) sums.set(key, (sums.get(key) ?? 0) + count);
      }
    }
    return Object.entries(labels).map(([key, series]) => ({ start: point.periodStart, value: sums.get(key) ?? 0, series }));
  });
}

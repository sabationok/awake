import type { StatTimeline, UiChartPoint } from '@macontrol/contracts';
import { statGaugeAverage } from './stat-gauge-average';

/** Середнє заміру `value` по бакетах; бакет без замірів — 0, щоб вісь лишалась суцільною. */
export function gaugeChartPoints(timeline: StatTimeline, value: string, scale = 1): UiChartPoint[] {
  return timeline.points.map((point) => ({ start: point.periodStart, value: (statGaugeAverage(point.metrics, value) ?? 0) * scale }));
}

/**
 * Лічильник, складений по одному виміру: `by: 'value'` — серія на кожне значення (шлях запиту), статуси складено;
 * `by: 'status'` — серія на кожен статус (клас відповіді), значення складено. `labels` — назви серій; чого там немає,
 * того не показуємо. Кілька ключів з однією назвою складаються в одну серію.
 */
export function counterChartPoints(timeline: StatTimeline, by: 'value' | 'status', labels: Record<string, string>): UiChartPoint[] {
  const series = [...new Set(Object.values(labels))];
  return timeline.points.flatMap((point) => {
    const sums = new Map<string, number>();
    for (const [value, statuses] of Object.entries(point.metrics)) {
      for (const [status, count] of Object.entries(statuses)) {
        const label = labels[by === 'value' ? value : status];
        if (label !== undefined) sums.set(label, (sums.get(label) ?? 0) + count);
      }
    }
    return series.map((name) => ({ start: point.periodStart, value: sums.get(name) ?? 0, series: name }));
  });
}

/** Усе в бакеті разом (значення × статуси): одна серія, `series` — її назва в stacked-графіку. */
export function totalChartPoints(timeline: StatTimeline, series?: string): UiChartPoint[] {
  return timeline.points.map((point) => {
    let value = 0;
    for (const statuses of Object.values(point.metrics)) for (const count of Object.values(statuses)) value += count;
    return series === undefined ? { start: point.periodStart, value } : { start: point.periodStart, value, series };
  });
}

/**
 * Складає точки кількох джерел (namespace-и, серії одного namespace) з тим самим бакетом і серією. Порядок — як у
 * першій появі; точки без серії складаються з точками без серії (і з `''`, як у `counterChartPoints` з `{ x: '' }`).
 */
export function sumChartPoints(...parts: UiChartPoint[][]): UiChartPoint[] {
  const out = new Map<string, UiChartPoint>();
  for (const points of parts) {
    for (const point of points) {
      const key = `${point.start}\u0000${point.series ?? ''}`;
      const current = out.get(key);
      if (current) current.value += point.value;
      else out.set(key, { ...point });
    }
  }
  return [...out.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

import type { UiTone } from '@awake/contracts';

/** Кольори серій stacked-графіка по черзі; червоний лишається для помилок. */
const SERIES_TONES: UiTone[] = ['accent', 'green', 'indigo', 'yellow', 'orange', 'gray'];

/** Серія → колір для `UiChart.tones`, у порядку серій. */
export function statSeriesTones(series: string[]): Record<string, UiTone> {
  return Object.fromEntries(series.map((name, index) => [name, SERIES_TONES[index % SERIES_TONES.length]]));
}

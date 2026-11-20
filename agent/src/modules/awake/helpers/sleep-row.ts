import type { MacState, UiRow } from '@awake/contracts';

/** Рядок «Сон»: чи блокує Mac сон, як StatusSection у SwiftUI. */
export function sleepRow(mac: MacState): UiRow {
  if (mac.sleepBlocked) {
    return { id: 'sleep', type: 'row', label: 'Сон', value: 'Заблоковано', icon: { symbol: 'moon.fill', tone: 'indigo' }, dot: { tone: 'green' } };
  }
  return { id: 'sleep', type: 'row', label: 'Сон', value: 'Працює звично', icon: { symbol: 'moon.fill', tone: 'indigo' }, dot: { tone: 'gray' } };
}

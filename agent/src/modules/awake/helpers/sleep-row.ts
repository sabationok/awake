import type { MacState, UiRow } from '@awake/contracts';

/** Рядок «Сон»: чи блокує Mac сон. Стан уже в тексті праворуч, тож без крапки-індикатора. */
export function sleepRow(mac: MacState): UiRow {
  if (mac.sleepBlocked) {
    return { id: 'sleep', type: 'row', label: 'Сон', value: 'Заблоковано', icon: { symbol: 'moon.fill', tone: 'indigo' } };
  }
  return { id: 'sleep', type: 'row', label: 'Сон', value: 'Працює звично', icon: { symbol: 'moon.fill', tone: 'indigo' } };
}

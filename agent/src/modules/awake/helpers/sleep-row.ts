import { showWhen } from '@macontrol/contracts';
import type { UiRow } from '@macontrol/contracts';

/**
 * Рядок «Сон»: чи блокує Mac сон. Обидва варіанти в layout, видно один за `system.sleepBlocked`, тож старт і стоп
 * сесії не міняють сторінку. Стан уже в тексті праворуч, тож без крапки-індикатора.
 */
export function sleepRows(): UiRow[] {
  const icon = { symbol: 'moon.fill', tone: 'indigo' } as const;
  return [
    { id: 'sleep', type: 'row', label: 'Сон', value: 'Заблоковано', icon, show: showWhen('system.sleepBlocked', 'true') },
    { id: 'sleep-normal', type: 'row', label: 'Сон', value: 'Працює звично', icon, show: showWhen('system.sleepBlocked', 'false') },
  ];
}

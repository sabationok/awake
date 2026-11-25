import type { PickDeliveryDto } from '../dto/pick-delivery.dto';
import type { DeliveryAddressee } from '../types/groups-delivery.types';

/**
 * Єдине місце, де вирішується, куди йде сповіщення. `private` — лише приватний чат. `group` — група, а якщо групи
 * зараз немає (не прив'язана, бот вийшов, теми вимкнені) — приватний чат, щоб сповіщення не зникло. `both` — обидва.
 * Збій відправки в групу тут не видно: запасний приватний чат на цей випадок вмикає той, хто шле.
 */
export function pickDelivery({ mode, targets }: PickDeliveryDto): DeliveryAddressee[] {
  const group = targets.map((target): DeliveryAddressee => ({ kind: 'group', target }));
  if (mode === 'private' || group.length === 0) return [{ kind: 'private' }];
  return mode === 'both' ? [{ kind: 'private' }, ...group] : group;
}

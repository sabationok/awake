import type { GroupTarget } from '../types/group-provider.types';
import type { GroupsDeliveryMode } from '../types/groups-delivery.types';

export class PickDeliveryDto {
  mode!: GroupsDeliveryMode;
  /** Адресати джерела в прив'язаній групі (`GroupsService.resolveTargets`); порожньо — групи зараз немає. */
  targets!: GroupTarget[];
}

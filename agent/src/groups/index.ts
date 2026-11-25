/**
 * Публічна поверхня ядра «Груп»: конектори (`telegram/**`) і `app.module.ts` імпортують лише звідси. Усередині
 * модуля файли імпортують один одного напряму, не через цей barrel.
 */
export { GroupsModule } from './groups.module';
export { GroupsService } from './groups.service';
export { GroupsBindingService } from './groups-binding.service';
export { GroupsSettingsService } from './groups-settings.service';
export { GroupsMacModule } from './groups.mac-module';
export { GROUP_PROVIDERS } from './constants/group-providers';
export { GROUPS_MODULE } from './constants/groups-module';
export { GROUPS_NOTIFICATION } from './constants/groups-notifications';
export { GROUPS_COMMANDS_KEY } from './constants/groups-settings';
export { GROUPS_STAT, type GroupsStatKey } from './constants/groups-stats';
export { pickDelivery } from './helpers/pick-delivery';
export { errorMessage } from './helpers/error-message';
export type { EnsureGroupTopicDto } from './dto/ensure-group-topic.dto';
export type { GroupRefDto } from './dto/group-ref.dto';
export type { InspectGroupDto } from './dto/inspect-group.dto';
export type { LeaveGroupDto } from './dto/leave-group.dto';
export type { SendGroupMessageDto } from './dto/send-group-message.dto';
export type { GroupChatEntity } from './entities/group-chat.entity';
export type { GroupDeliveryMap } from './types/group-delivery-map.types';
export type { GroupInspection, GroupProvider, GroupTarget, GroupTopicRef } from './types/group-provider.types';
export type { DeliveryAddressee, GroupsDeliveryMode } from './types/groups-delivery.types';

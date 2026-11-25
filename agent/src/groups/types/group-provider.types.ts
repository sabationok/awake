import type { GroupBotRights, GroupProviderId, GroupProviderManifest } from '@awake/contracts';
import type { RegisterGroupAddedDto } from '../dto/register-group-added.dto';
import type { UpdateGroupRightsDto } from '../dto/update-group-rights.dto';
import type { EnsureGroupTopicDto } from '../dto/ensure-group-topic.dto';
import type { GroupRefDto } from '../dto/group-ref.dto';
import type { InspectGroupDto } from '../dto/inspect-group.dto';
import type { LeaveGroupDto } from '../dto/leave-group.dto';
import type { SendGroupMessageDto } from '../dto/send-group-message.dto';

export interface GroupTopicRef {
  threadId: number;
}

export interface GroupInspection {
  title: string;
  topicsEnabled: boolean;
  botRights: GroupBotRights;
}

/** Куди слати сповіщення джерела в прив'язаній групі. `threadId` немає — у загальну стрічку групи. */
export interface GroupTarget {
  provider: GroupProviderId;
  chatId: string;
  threadId?: number;
}

/**
 * Конектор групи. Ядро читає `manifest` і не перевіряє можливості по ходу; виклик незадекларованої — помилка
 * (`GroupsService.requireCapability`).
 */
export interface GroupProvider {
  manifest: GroupProviderManifest;
  ensureTopic(dto: EnsureGroupTopicDto): Promise<GroupTopicRef>;
  send(dto: SendGroupMessageDto): Promise<void>;
  leave(dto: LeaveGroupDto): Promise<void>;
  inspect(dto: InspectGroupDto): Promise<GroupInspection>;
}

/** Нейтральні події конектора для ядра. */
export interface GroupAddedEvent {
  type: 'group.added';
  group: RegisterGroupAddedDto;
}

export interface GroupRemovedEvent {
  type: 'group.removed';
  group: GroupRefDto;
}

export interface GroupRightsChangedEvent {
  type: 'group.rightsChanged';
  group: UpdateGroupRightsDto;
}

export type GroupEvent = GroupAddedEvent | GroupRemovedEvent | GroupRightsChangedEvent;

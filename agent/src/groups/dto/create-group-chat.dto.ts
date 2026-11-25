import type { GroupChatEntity } from '../entities/group-chat.entity';

export class CreateGroupChatDto implements Pick<GroupChatEntity, 'provider' | 'externalId' | 'title' | 'addedBy' | 'botRights'> {
  provider!: GroupChatEntity['provider'];
  externalId!: string;
  title!: string;
  addedBy!: string;
  botRights!: GroupChatEntity['botRights'];
  topicsEnabledAt!: string | null;
  requestedAt!: string | null;
  leftAt!: string | null;
}

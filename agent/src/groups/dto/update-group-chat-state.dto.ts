import type { GroupChatEntity } from '../entities/group-chat.entity';

/** Зміна рядка групи: лише задані поля. `null` у state-колонці скидає стан. */
export class UpdateGroupChatStateDto implements Partial<Pick<GroupChatEntity, 'title' | 'botRights' | 'topicsEnabledAt' | 'requestedAt' | 'boundAt' | 'leftAt' | 'addedBy'>> {
  title?: string;
  addedBy?: string;
  botRights?: GroupChatEntity['botRights'];
  topicsEnabledAt?: string | null;
  requestedAt?: string | null;
  boundAt?: string | null;
  leftAt?: string | null;
}

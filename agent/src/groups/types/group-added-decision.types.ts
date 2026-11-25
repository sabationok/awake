import type { GroupChatEntity } from '../entities/group-chat.entity';

/** Що робити конектору після `registerAdded`: спитати власника чи вийти з чужої групи. */
export interface GroupAddedDecision {
  action: 'confirm' | 'leave';
  group: GroupChatEntity;
}

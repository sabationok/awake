import type { GroupChatEntity } from '../entities/group-chat.entity';

/** Що робити конектору після `registerAdded`: `listed` — бот лишається і мовчить, група у списку; `leave` — вийти (список переповнено). */
export interface GroupAddedDecision {
  action: 'listed' | 'leave';
  group: GroupChatEntity;
}

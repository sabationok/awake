import type { GroupBotRights } from '@awake/contracts';
import type { ChatMember } from 'telegraf/types';

/** Права бота з `ChatMember` Telegram → нейтральний знімок ядра. Не адмін — жодного права. */
export function toGroupBotRights(member: ChatMember): GroupBotRights {
  if (member.status === 'creator') return { isAdmin: true, canManageTopics: true, canDeleteMessages: true, canPinMessages: true };
  if (member.status !== 'administrator') return { isAdmin: false, canManageTopics: false, canDeleteMessages: false, canPinMessages: false };
  return {
    isAdmin: true,
    canManageTopics: member.can_manage_topics === true,
    canDeleteMessages: member.can_delete_messages,
    canPinMessages: member.can_pin_messages === true,
  };
}

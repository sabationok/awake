import type { ChatMember } from 'telegraf/types';

/** Чи учасник зараз у чаті: `restricted` буває і тим, хто вийшов (`is_member = false`). */
export function isChatMember(member: ChatMember): boolean {
  if (member.status === 'restricted') return member.is_member;
  return member.status === 'creator' || member.status === 'administrator' || member.status === 'member';
}

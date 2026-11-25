import type { ChatMember } from 'telegraf/types';

/** Власник у чаті: учасник, адмін або творець. `restricted`, `left`, `kicked` — ні. */
export function isOwnerInChat(member: ChatMember): boolean {
  return member.status === 'creator' || member.status === 'administrator' || member.status === 'member';
}

import type { Chat, User } from 'telegraf/types';

/** Відправник — власник: його id з telegram.env (у приватному чаті він же id чату). */
export function isOwnerUser(from: User | undefined, ownerId: string): boolean {
  return from !== undefined && String(from.id) === ownerId;
}

/** Чат — приватний чат власника з ботом. */
export function isOwnerPrivateChat(chat: Chat | undefined, ownerId: string): boolean {
  return chat?.type === 'private' && String(chat.id) === ownerId;
}

/** Власний приватний чат: і чат, і відправник мають id з telegram.env. */
export function isOwnerChat(chat: Chat | undefined, from: User | undefined, chatId: string): boolean {
  return isOwnerPrivateChat(chat, chatId) && isOwnerUser(from, chatId);
}

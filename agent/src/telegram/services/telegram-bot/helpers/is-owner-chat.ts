import type { Chat, User } from 'telegraf/types';

/** Бот слухає лише власний приватний чат: і чат, і відправник мають id з telegram.env. */
export function isOwnerChat(chat: Chat | undefined, from: User | undefined, chatId: string): boolean {
  return chat?.type === 'private' && String(chat.id) === chatId && from !== undefined && String(from.id) === chatId;
}

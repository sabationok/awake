import type { TelegramEnv } from '../types/telegram-env.types';
import { localApiRoot } from './local-api-root';
import { unquoteEnvValue } from './unquote-env-value';

const LINE_PATTERN = /^\s*(TG_BOT_TOKEN|TG_CHAT_ID|TG_API_ROOT)\s*=\s*(.*?)\s*$/;

/** Розбирає TG_BOT_TOKEN і TG_CHAT_ID; без будь-кого з них конфіг не годиться. TG_API_ROOT — лише для локального mock-сервера. */
export function parseTelegramEnv(text: string): TelegramEnv | null {
  const values = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    if (match) values.set(match[1], unquoteEnvValue(match[2]));
  }
  const token = values.get('TG_BOT_TOKEN');
  const chatId = values.get('TG_CHAT_ID');
  return token && chatId ? { token, chatId, apiRoot: localApiRoot(values.get('TG_API_ROOT')) } : null;
}

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { TelegramEnv } from '../types/telegram-env.types';
import { parseTelegramEnv } from './parse-telegram-env';

const DEFAULT_PATH = join(homedir(), '.config/awake/telegram.env');

/** Читає telegram.env; шлях можна перевизначити через AWAKE_TELEGRAM_ENV. Немає файлу → null. */
export function readTelegramEnv(env: NodeJS.ProcessEnv = process.env): TelegramEnv | null {
  let text: string;
  try {
    text = readFileSync(env.AWAKE_TELEGRAM_ENV || DEFAULT_PATH, 'utf8');
  } catch {
    return null;
  }
  return parseTelegramEnv(text);
}

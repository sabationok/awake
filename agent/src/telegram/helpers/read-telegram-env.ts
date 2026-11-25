import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { TelegramEnv } from '../types/telegram-env.types';
import { parseTelegramEnv } from './parse-telegram-env';

const DEFAULT_PATH = join(homedir(), '.config/awake/telegram.env');

/** Шлях telegram.env: MACONTROL_TELEGRAM_ENV або стандартний. Поруч із ним лежить і файл топіків для скрипта. */
export function telegramEnvPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.MACONTROL_TELEGRAM_ENV || DEFAULT_PATH;
}

/** Читає telegram.env; шлях можна перевизначити через MACONTROL_TELEGRAM_ENV. Немає файлу → null. */
export function readTelegramEnv(env: NodeJS.ProcessEnv = process.env): TelegramEnv | null {
  let text: string;
  try {
    text = readFileSync(telegramEnvPath(env), 'utf8');
  } catch {
    return null;
  }
  return parseTelegramEnv(text);
}

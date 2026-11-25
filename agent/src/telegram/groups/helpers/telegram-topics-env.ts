import { chmodSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { GroupDeliveryMap } from '../../../groups';
import { telegramEnvPath } from '../../helpers/read-telegram-env';
import { TELEGRAM_TOPICS_ENV_FILE } from '../constants/telegram-group-delivery';

/** Джерело стає частиною імені ключа `TG_THREAD_<source>`: лише такі id скрипт може знайти. */
const SOURCE_KEY = /^[A-Za-z0-9_]+$/;

/** Шлях файла топіків: той самий каталог, що й у telegram.env. */
export function telegramTopicsEnvPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(dirname(telegramEnvPath(env)), TELEGRAM_TOPICS_ENV_FILE);
}

/** `TG_GROUP_ID=<chat id>` і по рядку `TG_THREAD_<source>=<thread id>`; null (слати в групу нікуди) — порожній текст. */
export function formatTelegramTopicsEnv(map: GroupDeliveryMap | null): string {
  if (!map) return '';
  const threads = Object.entries(map.threads)
    .filter(([source]) => SOURCE_KEY.test(source))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, threadId]) => `TG_THREAD_${source}=${threadId}`);
  return [`TG_GROUP_ID=${map.chatId}`, ...threads, ''].join('\n');
}

/** Пише файл цілком і атомарно (tmp + rename), режим 0600; порожній текст — файл видаляється. */
export function writeTelegramTopicsEnv(path: string, text: string): void {
  if (text === '') {
    rmSync(path, { force: true });
    return;
  }
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, path);
}

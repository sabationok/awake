import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { unquoteEnvValue } from '../../telegram/helpers/unquote-env-value';

const DEFAULT_PATH = join(homedir(), '.config/awake/envify.env');
const TOKEN_LINE = /^\s*ENVIFY_TOKEN\s*=\s*(.*?)\s*$/m;

/**
 * Токен сервісу Envify (`envify_…`) з envify.env, який пише аппка (шлях можна перевизначити через MACONTROL_ENVIFY_ENV).
 * Немає файлу — process.env.ENVIFY_TOKEN, немає й його — null.
 */
export function readEnvifyToken(env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const match = TOKEN_LINE.exec(readFileSync(env.MACONTROL_ENVIFY_ENV || DEFAULT_PATH, 'utf8'));
    const token = match ? unquoteEnvValue(match[1]) : '';
    if (token) return token;
  } catch {
    // Файлу немає: Envify не підключено.
  }
  return env.ENVIFY_TOKEN || null;
}

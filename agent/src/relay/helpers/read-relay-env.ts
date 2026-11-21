import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { RelayEnv } from '../types/relay-env.types';
import { parseRelayEnv } from './parse-relay-env';

const DEFAULT_PATH = join(homedir(), '.config/awake/relay.env');

/** Читає relay.env (шлях можна перевизначити через MACONTROL_RELAY_ENV) разом з process.env. */
export function readRelayEnv(env: NodeJS.ProcessEnv = process.env): RelayEnv | null {
  let text = '';
  try {
    text = readFileSync(env.MACONTROL_RELAY_ENV || DEFAULT_PATH, 'utf8');
  } catch {
    // Файлу може не бути, якщо все прийшло з process.env.
  }
  return parseRelayEnv(text, env);
}

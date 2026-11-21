import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { RelayConnectionKey } from '../types/relay-connection.types';
import type { RelayEnv } from '../types/relay-env.types';
import { collectRelayEnv, completeRelayEnv, RELAY_ENV_KEYS, RELAY_SECRET_FIELDS } from './parse-relay-env';

const DEFAULT_PATH = join(homedir(), '.config/awake/relay.env');

export interface RelayEnvRead {
  env: RelayEnv | null;
  path: string;
  /** Кожен ключ для сторінки Webhooxy, секрети без значень. */
  keys: RelayConnectionKey[];
}

/** Читає relay.env (шлях можна перевизначити через MACONTROL_RELAY_ENV) разом з process.env і змінними Envify. */
export function readRelayEnv(envify: Readonly<Record<string, string>>, env: NodeJS.ProcessEnv = process.env): RelayEnvRead {
  const path = env.MACONTROL_RELAY_ENV || DEFAULT_PATH;
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    // Файлу може не бути, якщо все прийшло з Envify чи process.env.
  }
  const { values, sources } = collectRelayEnv(text, env, envify);
  const keys = (Object.entries(RELAY_ENV_KEYS) as [keyof RelayEnv, string][]).map(([field, name]) => {
    const secret = RELAY_SECRET_FIELDS.has(field);
    return { field, name, source: sources[field], secret, value: secret ? null : (values[field] ?? null) };
  });
  return { env: completeRelayEnv(values), path, keys };
}

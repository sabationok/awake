import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SecretKeyInfo, SecretSource } from '@awake/contracts';
import { unquoteEnvValue } from '../../telegram/helpers/unquote-env-value';
import { APP_SECRET_KEYS, type AppSecretField } from '../constants/app-secret-keys';

const LINE_PATTERN = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/;

/** Локальне сховище секретів аппки (пише лише Mac-аппка). */
export const SECRETS_ENV_PATH = join(homedir(), '.config/awake/secrets.env');
/** Старий файл ключів relay: секрети звідти ще читаємо, поки їх не перенесли. */
const LEGACY_RELAY_ENV_PATH = join(homedir(), '.config/awake/relay.env');

export interface AppSecretsRead {
  values: Partial<Record<AppSecretField, string>>;
  /** Для аппки: ім'я, звідки, без значень. */
  keys: SecretKeyInfo[];
}

export function readEnvFile(path: string): Map<string, string> {
  const values = new Map<string, string>();
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return values;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    if (match) values.set(match[1], unquoteEnvValue(match[2]));
  }
  return values;
}

/** Кожен секрет окремо. Пріоритет: process.env, Envify, secrets.env, relay.env; у межах джерела — основне ім'я, потім старі. */
export function readAppSecrets(envify: Readonly<Record<string, string>>, env: NodeJS.ProcessEnv = process.env): AppSecretsRead {
  const files = [readEnvFile(env.MACONTROL_SECRETS_ENV || SECRETS_ENV_PATH), readEnvFile(env.MACONTROL_RELAY_ENV || LEGACY_RELAY_ENV_PATH)];
  const sources: [Exclude<SecretSource, null>, (name: string) => string | undefined][] = [
    ['env', (name) => env[name]],
    ['envify', (name) => envify[name]],
    ['file', (name) => files[0].get(name) || files[1].get(name)],
  ];
  const values: AppSecretsRead['values'] = {};
  const keys: SecretKeyInfo[] = [];
  for (const [field, names] of Object.entries(APP_SECRET_KEYS) as [AppSecretField, readonly string[]][]) {
    let source: SecretSource = null;
    for (const [from, get] of sources) {
      const value = names.map(get).find(Boolean);
      if (value) {
        values[field] = value;
        source = from;
        break;
      }
    }
    keys.push({ name: names[0], source, secret: true, value: null });
  }
  return { values, keys };
}

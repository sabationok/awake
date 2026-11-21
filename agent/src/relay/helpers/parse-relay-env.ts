import { unquoteEnvValue } from '../../telegram/helpers/unquote-env-value';
import type { RelayEnvKeySource } from '../types/relay-connection.types';
import type { RelayEnv } from '../types/relay-env.types';

export const RELAY_ENV_KEYS = {
  workspaceToken: 'WEBHOOXY_WORKSPACE_TOKEN',
  destId: 'WEBHOOXY_DEST_ID',
  workspace: 'WEBHOOXY_WORKSPACE',
  room: 'WEBHOOXY_ROOM',
  ticketKey: 'WEBHOOXY_JWT_TICKET_KEY',
} as const satisfies Record<keyof RelayEnv, string>;

/** Ключі, значення яких не показуємо ніде, навіть у SwiftUI. */
export const RELAY_SECRET_FIELDS: ReadonlySet<keyof RelayEnv> = new Set(['workspaceToken', 'ticketKey']);

const LINE_PATTERN = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/;

export interface CollectedRelayEnv {
  values: Partial<RelayEnv>;
  sources: Record<keyof RelayEnv, RelayEnvKeySource>;
}

/** Кожен ключ окремо: значення і звідки воно (process.env має пріоритет над relay.env). */
export function collectRelayEnv(text: string, env: NodeJS.ProcessEnv): CollectedRelayEnv {
  const fromFile = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    if (match) fromFile.set(match[1], unquoteEnvValue(match[2]));
  }
  const values: Partial<RelayEnv> = {};
  const sources = {} as Record<keyof RelayEnv, RelayEnvKeySource>;
  for (const [field, key] of Object.entries(RELAY_ENV_KEYS) as [keyof RelayEnv, string][]) {
    const fromEnv = env[key];
    const value = fromEnv || fromFile.get(key);
    sources[field] = fromEnv ? 'env' : value ? 'file' : null;
    if (value) values[field] = value;
  }
  return { values, sources };
}

/**
 * Збирає RelayEnv: спершу process.env (туди їх може покласти Envify), потім текст relay.env.
 * Бракує хоч одного ключа → null, relay вимкнено.
 */
export function parseRelayEnv(text: string, env: NodeJS.ProcessEnv): RelayEnv | null {
  const { values } = collectRelayEnv(text, env);
  return (Object.keys(RELAY_ENV_KEYS) as (keyof RelayEnv)[]).every((field) => values[field]) ? (values as RelayEnv) : null;
}

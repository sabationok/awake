import { unquoteEnvValue } from '../../telegram/helpers/unquote-env-value';
import type { RelayEnv } from '../types/relay-env.types';

const KEYS = {
  workspaceToken: 'WEBHOOXY_WORKSPACE_TOKEN',
  destId: 'WEBHOOXY_DEST_ID',
  workspace: 'WEBHOOXY_WORKSPACE',
  room: 'WEBHOOXY_ROOM',
  ticketKey: 'WEBHOOXY_JWT_TICKET_KEY',
} as const satisfies Record<keyof RelayEnv, string>;

const LINE_PATTERN = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/;

/**
 * Збирає RelayEnv: спершу process.env (туди їх може покласти Envify), потім текст relay.env.
 * Бракує хоч одного ключа → null, relay вимкнено.
 */
export function parseRelayEnv(text: string, env: NodeJS.ProcessEnv): RelayEnv | null {
  const fromFile = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    if (match) fromFile.set(match[1], unquoteEnvValue(match[2]));
  }
  const result: Partial<RelayEnv> = {};
  for (const [field, key] of Object.entries(KEYS) as [keyof RelayEnv, string][]) {
    const value = env[key] || fromFile.get(key);
    if (!value) return null;
    result[field] = value;
  }
  return result as RelayEnv;
}

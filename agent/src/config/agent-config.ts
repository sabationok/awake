import { homedir } from 'node:os';
import { join } from 'node:path';

/** Налаштування агента з env, які задає Mac-аппка при запуску підпроцесу. */
export interface AgentConfig {
  port: number;
  token: string;
  dbPath: string;
  webDir: string | null;
  upstashUrl: string | null;
  upstashToken: string | null;
  /** Дозволений origin для CORS, лише для розробки дашборду через next dev. */
  corsOrigin: string | null;
}

export const AGENT_CONFIG = Symbol('AGENT_CONFIG');

export function readAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const token = env.AWAKE_AGENT_TOKEN ?? '';
  if (token.length < 16) throw new Error('AWAKE_AGENT_TOKEN missing or shorter than 16 characters');
  return {
    port: Number(env.AWAKE_AGENT_PORT ?? 47800),
    token,
    dbPath: env.AWAKE_DB ?? join(homedir(), '.config/awake/awake.db'),
    webDir: env.AWAKE_WEB_DIR || null,
    upstashUrl: env.UPSTASH_REDIS_REST_URL || null,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN || null,
    corsOrigin: env.AWAKE_CORS_ORIGIN || null,
  };
}

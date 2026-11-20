import { homedir } from 'node:os';
import { join } from 'node:path';

/** Дашборд на Vercel, який може викликати агент напряму по HTTPS. */
const DEFAULT_DASHBOARD_ORIGINS = ['https://awake-lemon.vercel.app'];

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
  /** Origins дашбордів, які можуть викликати агент напряму з браузера. */
  dashboardOrigins: string[];
  /** Каталог локального CA і сертифікатів агента. */
  tlsDir: string;
}

export const AGENT_CONFIG = Symbol('AGENT_CONFIG');

export function readAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  const token = env.AWAKE_AGENT_TOKEN ?? '';
  if (token.length < 16) throw new Error('AWAKE_AGENT_TOKEN missing or shorter than 16 characters');
  const listedOrigins = (env.AWAKE_DASHBOARD_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  return {
    port: Number(env.AWAKE_AGENT_PORT ?? 47800),
    token,
    dbPath: env.AWAKE_DB ?? join(homedir(), '.config/awake/awake.db'),
    webDir: env.AWAKE_WEB_DIR || null,
    upstashUrl: env.UPSTASH_REDIS_REST_URL || null,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN || null,
    corsOrigin: env.AWAKE_CORS_ORIGIN || null,
    dashboardOrigins: listedOrigins.length ? listedOrigins : DEFAULT_DASHBOARD_ORIGINS,
    tlsDir: env.AWAKE_TLS_DIR || join(homedir(), '.config/awake/tls'),
  };
}

import { homedir } from 'node:os';
import { join } from 'node:path';

/** Дашборд на Vercel, який може викликати агент напряму по HTTPS. */
const DEFAULT_DASHBOARD_ORIGINS = ['https://awake-lemon.vercel.app'];

export type Stage = 'dev' | 'production';

/** Залежності кожного stage: агент ходить лише в сервіси свого stage. */
const STAGE_DEPS: Record<Stage, { webhooxyUrl: string | null; envifyUrl: string | null }> = {
  dev: { webhooxyUrl: 'https://webhooks-proxy-dev.up.railway.app', envifyUrl: 'https://envify-manager.vercel.app' },
  production: { webhooxyUrl: null, envifyUrl: null },
};

function readStage(value: string | undefined): Stage {
  const stage = value ?? 'dev';
  if (stage !== 'dev' && stage !== 'production') throw new Error(`MACONTROL_STAGE must be dev or production, got ${stage}`);
  return stage;
}

/** Налаштування агента з env, які задає Mac-аппка при запуску підпроцесу. */
export interface AgentConfig {
  stage: Stage;
  /** webhooxy того самого stage; null, поки для stage його немає. */
  webhooxyUrl: string | null;
  /** Envify того самого stage; токен сервісу лежить у ~/.config/awake/envify.env. */
  envifyUrl: string | null;
  port: number;
  /**
   * Порт простого http для локального сполучення в довіреній Wi-Fi (без сертифіката, тож без попереджень браузера).
   * HTTPS на `port` лишається для дашборду на Vercel: https-сторінка не може звертатися до http-адреси.
   */
  httpPort: number;
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
  const token = env.MACONTROL_AGENT_TOKEN ?? '';
  if (token.length < 16) throw new Error('MACONTROL_AGENT_TOKEN missing or shorter than 16 characters');
  const listedOrigins = (env.MACONTROL_DASHBOARD_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const stage = readStage(env.MACONTROL_STAGE);
  return {
    stage,
    webhooxyUrl: env.WEBHOOXY_URL || STAGE_DEPS[stage].webhooxyUrl,
    envifyUrl: env.ENVIFY_URL || STAGE_DEPS[stage].envifyUrl,
    port: Number(env.MACONTROL_AGENT_PORT ?? 47800),
    httpPort: Number(env.MACONTROL_AGENT_HTTP_PORT ?? Number(env.MACONTROL_AGENT_PORT ?? 47800) + 1),
    token,
    dbPath: env.MACONTROL_DB ?? join(homedir(), '.config/awake/awake.db'),
    webDir: env.MACONTROL_WEB_DIR || null,
    upstashUrl: env.UPSTASH_REDIS_REST_URL || null,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN || null,
    corsOrigin: env.MACONTROL_CORS_ORIGIN || null,
    dashboardOrigins: listedOrigins.length ? listedOrigins : DEFAULT_DASHBOARD_ORIGINS,
    tlsDir: env.MACONTROL_TLS_DIR || join(homedir(), '.config/awake/tls'),
  };
}

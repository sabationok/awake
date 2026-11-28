import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Web UI на Vercel, який може викликати агент напряму по HTTPS. */
const DEFAULT_DASHBOARD_ORIGINS = ['https://macontrol-sabationoks-projects.vercel.app'];

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
  /** Webhooxy (relay, вебхуки, дистанційне сполучення) взагалі ввімкнено: `MACONTROL_WEBHOOXY=on`. Без нього — ні сокета, ні пункту меню. */
  webhooxy: boolean;
  /** webhooxy того самого stage; null, поки для stage його немає. */
  webhooxyUrl: string | null;
  /** Envify того самого stage; токен сервісу лежить у ~/.config/awake/envify.env. */
  envifyUrl: string | null;
  port: number;
  /**
   * Порт простого http для локального сполучення в довіреній Wi-Fi (без сертифіката, тож без попереджень браузера).
   * HTTPS на `port` лишається для Web UI на Vercel: https-сторінка не може звертатися до http-адреси.
   */
  httpPort: number;
  /** Порт для `tailscale serve`, лише на 127.0.0.1: запит сюди — завжди з tailnet. */
  tailnetPort: number;
  token: string;
  dbPath: string;
  webDir: string | null;
  /**
   * Опублікований Web UI поза аппкою (`scripts/publish-web-local.sh`): має перевагу над збіркою з бандла,
   * тож новий веб не потребує перевстановлення аппки. Папки може не бути — тоді лише `webDir`.
   */
  webPublishedDir: string;
  upstashUrl: string | null;
  upstashToken: string | null;
  /** Дозволений origin для CORS, лише для розробки Web UI через next dev. */
  corsOrigin: string | null;
  /** Origins Web UI, які можуть викликати агент напряму з браузера. */
  dashboardOrigins: string[];
  /** Каталог локального CA і сертифікатів агента. */
  tlsDir: string;
  /**
   * Сервер працює сам, без Mac-аппки (`MACONTROL_STANDALONE=1`): stdin не є каналом з аппкою, а до macOS
   * він ходить через помічник. Без прапорця — старий режим: підпроцес аппки.
   */
  standalone: boolean;
  /** Бінарник помічника (`MACONTROL_HELPER`); потрібен лише в режимі standalone. */
  helperPath: string | null;
  /** Unix-сокет для Mac-аппки як клієнта (`MACONTROL_APP_SOCKET`); лише standalone. */
  appSocketPath: string;
  /** Паспорт запущеного сервера (pid, файл збірки) поруч із сокетом. */
  serverInfoPath: string;
}

export const AGENT_CONFIG = Symbol('AGENT_CONFIG');

/** Старі назви ключів у agent.env, які досі пише стара аппка. */
const LEGACY_KEYS: Record<string, string> = {
  AWAKE_AGENT_TOKEN: 'MACONTROL_AGENT_TOKEN',
  AWAKE_AGENT_PORT: 'MACONTROL_AGENT_PORT',
};

/**
 * Ключі сервера з `~/.config/awake/agent.env` (`MACONTROL_AGENT_ENV` міняє шлях). Сервер читає їх сам, тож будь-який
 * клієнт, що його запускає (стара аппка, Mac Umbra, скрипт), не носить токен. Значення з process.env мають перевагу.
 */
export function withAgentEnvFile(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const file = env.MACONTROL_AGENT_ENV || join(homedir(), '.config/awake/agent.env');
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return env;
  }
  const fromFile: NodeJS.ProcessEnv = {};
  for (const line of text.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    fromFile[match[1]] = value;
    const modern = LEGACY_KEYS[match[1]];
    if (modern && fromFile[modern] === undefined) fromFile[modern] = value;
  }
  return { ...fromFile, ...Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== '')) };
}

export function readAgentConfig(rawEnv: NodeJS.ProcessEnv = process.env): AgentConfig {
  const env = withAgentEnvFile(rawEnv);
  const token = env.MACONTROL_AGENT_TOKEN ?? '';
  if (token.length < 16) throw new Error('MACONTROL_AGENT_TOKEN missing or shorter than 16 characters');
  const listedOrigins = (env.MACONTROL_DASHBOARD_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const stage = readStage(env.MACONTROL_STAGE);
  return {
    stage,
    webhooxy: env.MACONTROL_WEBHOOXY === 'on',
    webhooxyUrl: env.WEBHOOXY_URL || STAGE_DEPS[stage].webhooxyUrl,
    envifyUrl: env.ENVIFY_URL || STAGE_DEPS[stage].envifyUrl,
    port: Number(env.MACONTROL_AGENT_PORT ?? 47800),
    httpPort: Number(env.MACONTROL_AGENT_HTTP_PORT ?? Number(env.MACONTROL_AGENT_PORT ?? 47800) + 1),
    tailnetPort: Number(env.MACONTROL_AGENT_TAILNET_PORT ?? Number(env.MACONTROL_AGENT_PORT ?? 47800) + 2),
    token,
    dbPath: env.MACONTROL_DB ?? join(homedir(), '.config/awake/awake.db'),
    webDir: env.MACONTROL_WEB_DIR || null,
    webPublishedDir: env.MACONTROL_WEB_PUBLISHED_DIR || join(homedir(), 'Library/Application Support/MaControl/web'),
    upstashUrl: env.UPSTASH_REDIS_REST_URL || null,
    upstashToken: env.UPSTASH_REDIS_REST_TOKEN || null,
    corsOrigin: env.MACONTROL_CORS_ORIGIN || null,
    dashboardOrigins: listedOrigins.length ? listedOrigins : DEFAULT_DASHBOARD_ORIGINS,
    tlsDir: env.MACONTROL_TLS_DIR || join(homedir(), '.config/awake/tls'),
    standalone: env.MACONTROL_STANDALONE === '1',
    helperPath: env.MACONTROL_HELPER || null,
    appSocketPath: env.MACONTROL_APP_SOCKET || join(homedir(), 'Library/Application Support/MaControl/server.sock'),
    serverInfoPath: env.MACONTROL_SERVER_INFO || join(homedir(), 'Library/Application Support/MaControl/server.json'),
  };
}

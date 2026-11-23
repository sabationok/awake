import type { UiEvent, UiLocalAccess, UiTree } from '@awake/contracts';
import { callAgent } from '@/features/pairing/agent-api';
import type { SduiMode } from '../sdui.types';
import { remoteSource } from './remote-source';

/** Снимок для Web UI на Vercel: дерево, керування (лише в direct) і режим для шапки. */
export interface HybridSnapshot {
  tree: UiTree | null;
  /** Є лише в режимі direct; без нього рендерер вимикає всі керувальні елементи. */
  send?: (event: UiEvent) => Promise<void>;
  mode: SduiMode;
  /** Прямий запит до Mac не дійшов на рівні мережі: інша Wi-Fi або локальний сертифікат ще не довірений. */
  directError: boolean;
}

const tokenKey = (url: string) => `maccc.agentToken:${url}`;

function readToken(url: string): string | null {
  try {
    return localStorage.getItem(tokenKey(url));
  } catch {
    return null;
  }
}

function saveToken(url: string, token: string | null) {
  try {
    if (token) localStorage.setItem(tokenKey(url), token);
    else localStorage.removeItem(tokenKey(url));
  } catch {
    /* приватний режим: токен житиме лише до перезавантаження */
  }
}

/** Токен пристрою більше не дійсний: наступне опитування знову сполучиться з поточним кодом. */
function isUnauthorized(e: unknown): boolean {
  const err = e as { status?: number; code?: string } | null;
  return err?.status === 401 || err?.code === 'UNAUTHORIZED';
}

async function pair(local: UiLocalAccess): Promise<string> {
  const { token } = await callAgent<{ token: string }>(
    '/api/devices/pair',
    null,
    { method: 'POST', body: JSON.stringify({ code: local.code }) },
    local.url,
  );
  saveToken(local.url, token);
  return token;
}

function sendTo(local: UiLocalAccess, token: string) {
  return async (event: UiEvent) => {
    try {
      await callAgent<unknown>('/api/ui/events', token, { method: 'POST', body: JSON.stringify(event) }, local.url);
    } catch (e) {
      if (isUnauthorized(e)) {
        saveToken(local.url, null);
        throw new Error('Сполучення з Mac застаріло, оновлюю його');
      }
      if (e instanceof TypeError) throw new Error("Немає з'єднання з Mac");
      throw e;
    }
  };
}

function withLocal(tree: UiTree | null, local: UiLocalAccess): UiTree | null {
  return tree && { ...tree, app: { ...tree.app, local } };
}

const readOnly = (tree: UiTree | null, directError = false): HybridSnapshot => ({ tree, mode: 'readonly', directError });

/**
 * Дерево з Upstash (завжди, лише для перегляду). Якщо в ньому є app.local, браузер ходить до агента напряму:
 * дерево і керування беруться з його API. Будь-яка помилка лишає перегляд з Upstash.
 */
export const hybridSource = {
  async load(): Promise<HybridSnapshot> {
    const upstash = await remoteSource.load();
    const local = upstash?.app.local;
    if (!upstash || !local) return readOnly(upstash);
    try {
      const token = readToken(local.url) ?? (await pair(local));
      const tree = await callAgent<UiTree | null>('/api/ui?scope=all', token, {}, local.url);
      return { tree: withLocal(tree ?? null, local), send: sendTo(local, token), mode: 'direct', directError: false };
    } catch (e) {
      if (isUnauthorized(e)) saveToken(local.url, null);
      return readOnly(upstash, e instanceof TypeError);
    }
  },
};

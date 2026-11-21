import type { EnvifyConfig } from '../types/envify-config.types';

const TIMEOUT_MS = 10_000;
const RETRIES = 2;
const RETRY_BASE_MS = 300;

/**
 * Той самий запит, що `fetchConfig` з `@envify/sdk`: GET /api/v1/config з токеном сервісу, повтори на мережу і 5xx,
 * 4xx (поганий токен, видалений сервіс) — одразу помилка. SDK лежить у приватному репо, тож агент його не тягне.
 */
export async function fetchEnvifyConfig(url: string, token: string): Promise<EnvifyConfig> {
  const endpoint = new URL('/api/v1/config', url);
  let lastError = '';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * 2 ** (attempt - 1)));
    let res: Response;
    try {
      res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = (error as Error).message;
      continue;
    }
    if (res.ok) return (await res.json()) as EnvifyConfig;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    lastError = `Envify ${res.status}: ${body.error ?? res.statusText}`;
    if (res.status < 500) break;
  }
  throw new Error(lastError || `Envify недоступний: ${endpoint.origin}`);
}

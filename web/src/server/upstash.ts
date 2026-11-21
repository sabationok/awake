import 'server-only';

/**
 * Upstash з маркетплейсу Vercel дає KV_REST_API_*, напряму з Upstash — UPSTASH_REDIS_REST_*.
 * Читається на кожен виклик, не в module scope: Envify заповнює env в instrumentation, після імпорту модулів.
 */
function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_READ_ONLY_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return { url, token };
}

export const isUpstashConfigured = () => {
  const { url, token } = credentials();
  return !!(url && token);
};

/** Одна команда Redis через REST; повертає result або кидає помилку, якщо Upstash не 2xx. */
export async function upstashCommand<T>(args: (string | number)[]): Promise<T> {
  const { url, token } = credentials();
  if (!url || !token) throw new Error('Upstash не налаштовано');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const { result } = (await res.json()) as { result: T };
  return result;
}

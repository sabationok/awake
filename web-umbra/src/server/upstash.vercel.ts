import 'server-only';

/** Ті самі змінні, що в web: UPSTASH_REDIS_REST_* напряму або KV_REST_API_* з маркетплейсу Vercel. Лише читання. */
function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_READ_ONLY_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return { url, token };
}

export const isUpstashConfigured = () => {
  const { url, token } = credentials();
  return Boolean(url && token);
};

export async function upstashGet(key: string): Promise<string | null> {
  const { url, token } = credentials();
  if (!url || !token) throw new Error('Upstash не налаштовано');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  return ((await res.json()) as { result: string | null }).result;
}

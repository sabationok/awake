import 'server-only';
import { PRESENCE_KEY } from '@awake/contracts';
import type { Presence } from '@awake/contracts';

/** Upstash з маркетплейсу Vercel дає KV_REST_API_*, напряму з Upstash — UPSTASH_REDIS_REST_*. */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_READ_ONLY_TOKEN ?? process.env.KV_REST_API_TOKEN;

/** Останній стан Mac або null, якщо ключ протух (Mac офлайн довше за TTL). */
export async function readPresence(): Promise<Presence | null> {
  if (!url || !token) throw new Error('Upstash env is not configured');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', PRESENCE_KEY]),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const { result } = (await res.json()) as { result: string | null };
  return result ? (JSON.parse(result) as Presence) : null;
}

import { createHmac, timingSafeEqual } from 'node:crypto';
import { RELAY_TICKET_AUDIENCE, RELAY_TICKET_TTL_SECONDS } from '@awake/contracts';
import type { RelayTicketClaims } from '@awake/contracts';

export type TicketCheck = { ok: true; claims: RelayTicketClaims } | { ok: false; reason: string };

function decodePart(part: string): unknown {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

/**
 * Перевіряє квиток viewer-а (JWT HS256): підпис, alg, aud, room, iat/exp і межу TTL.
 * Одноразовість jti перевіряє викликач: тут лише чиста функція.
 */
export function verifyViewerTicket(token: unknown, key: string, room: string, nowSeconds = Math.floor(Date.now() / 1000)): TicketCheck {
  // Токен приходить від viewer-а через webhooxy без перевірки: будь-що, крім рядка розумної довжини, відкидаємо одразу.
  if (typeof token !== 'string' || token.length > 4096) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [headerPart, payloadPart, signaturePart] = parts;
  const expected = createHmac('sha256', key).update(`${headerPart}.${payloadPart}`).digest();
  const actual = Buffer.from(signaturePart, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { ok: false, reason: 'signature' };
  let header: { alg?: unknown };
  let claims: Partial<RelayTicketClaims>;
  try {
    header = decodePart(headerPart) as { alg?: unknown };
    claims = decodePart(payloadPart) as Partial<RelayTicketClaims>;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (header.alg !== 'HS256') return { ok: false, reason: 'alg' };
  if (claims.aud !== RELAY_TICKET_AUDIENCE) return { ok: false, reason: 'aud' };
  if (claims.room !== room) return { ok: false, reason: 'room' };
  if (typeof claims.sub !== 'string' || typeof claims.jti !== 'string') return { ok: false, reason: 'claims' };
  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return { ok: false, reason: 'claims' };
  if (claims.exp - claims.iat > RELAY_TICKET_TTL_SECONDS) return { ok: false, reason: 'ttl' };
  // 30 с запасу на розбіжність годинників Vercel і Mac.
  if (claims.exp < nowSeconds || claims.iat > nowSeconds + 30) return { ok: false, reason: 'expired' };
  return { ok: true, claims: claims as RelayTicketClaims };
}

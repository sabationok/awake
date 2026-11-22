import { createHmac, randomUUID } from 'node:crypto';
import { RELAY_TICKET_AUDIENCE, RELAY_TICKET_TTL_SECONDS, type RelayTicketClaims } from '@awake/contracts';

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Квиток viewer-а relay (JWT HS256), який підписує сам Mac для сполученого пристрою; перевіряє його verifyViewerTicket. */
export function signViewerTicket(key: string, room: string, sub: string, now = Math.floor(Date.now() / 1000)): string {
  const claims: RelayTicketClaims = { aud: RELAY_TICKET_AUDIENCE, sub, room, iat: now, exp: now + RELAY_TICKET_TTL_SECONDS, jti: randomUUID() };
  const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}`;
  return `${unsigned}.${createHmac('sha256', key).update(unsigned).digest('base64url')}`;
}

// Relay через webhooxy (docs/relay-contract.md): типи поля `data`, якими обмінюються агент (host) і дашборд (viewer).
// Конверт і події socket.io задає webhooxy; тут лише формат MaControl.
import type { UiEvent, UiTree } from './ui';

/** viewer → host (`relay:send`). */
export type RelayViewerMessage = { type: 'ping' } | { type: 'tree' } | { type: 'event'; event: UiEvent };

/** host → viewer: відповідь в ack на `relay:send`. */
export type RelayHostReply = { type: 'pong' } | { type: 'tree'; tree: UiTree } | { type: 'accepted' } | { type: 'error'; message: string };

/** host → viewers (`relay:broadcast`): нове дерево після зміни стану. */
export type RelayHostBroadcast = { type: 'tree'; tree: UiTree };

/** Audience квитка viewer-а: його перевіряє агент у `relay:authorize`. */
export const RELAY_TICKET_AUDIENCE = 'macontrol-agent';
/** Квиток живе недовго: він потрібен лише на handshake. */
export const RELAY_TICKET_TTL_SECONDS = 300;

/** Claims квитка viewer-а (JWT HS256, ключ WEBHOOXY_JWT_TICKET_KEY). */
export interface RelayTicketClaims {
  aud: typeof RELAY_TICKET_AUDIENCE;
  sub: string;
  room: string;
  iat: number;
  exp: number;
  jti: string;
}

/** Що дашборд отримує від свого сервера для підключення viewer-а. */
export interface RelayViewerAccess {
  url: string;
  room: string;
  workspace: string;
  token: string;
}

/**
 * Кукі пристрою, сполученого дистанційно: HttpOnly на домені дашборду, значення — токен пристрою.
 * Проксі дашборду пропускає в webhooxy лише кукі з префіксом `mc_`.
 */
export const RELAY_DEVICE_COOKIE = 'mc_device';
/** Префікс кукі, які проксі дашборду передає агенту; решта (сесія дашборду) у webhooxy не йде. */
export const RELAY_COOKIE_PREFIX = 'mc_';

/** Відповідь агента на опитування дистанційного сполучення: токен не в тілі, а в кукі `mc_device`. */
export interface RelayPairPoll {
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

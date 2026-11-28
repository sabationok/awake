// Relay через webhooxy (docs/relay-contract.md): типи поля `data`, якими обмінюються агент (host) і Web UI (viewer).
// Конверт і події socket.io задає webhooxy; тут лише формат MaControl.
import type { UiEvent, UiPageLayout, UiShell } from './ui';

/** viewer → host (`relay:send`): індекс роутів, одна сторінка або подія. */
export type RelayViewerMessage = { type: 'ping' } | { type: 'shell' } | { type: 'page'; pageId: string } | { type: 'event'; event: UiEvent };

/** host → viewer: відповідь в ack на `relay:send`. */
export type RelayHostReply =
  | { type: 'pong' }
  | { type: 'shell'; shell: UiShell }
  | { type: 'page'; page: UiPageLayout }
  | { type: 'accepted' }
  | { type: 'error'; message: string };

/** host → viewers (`relay:broadcast`): `rev` індексу і кожної сторінки після зміни; viewer перечитує, що тримає. */
export type RelayHostBroadcast = { type: 'revs'; shell: string; pages: Record<string, string> };

/** Audience квитка viewer-а: його перевіряє агент у `relay:authorize`. */
export const RELAY_TICKET_AUDIENCE = 'macontrol-agent';
/** Квиток живе недовго: він потрібен лише на handshake. */
export const RELAY_TICKET_TTL_SECONDS = 300;

/** Claims квитка viewer-а (JWT HS256, ключ MACONTROL_JWT_KEY). */
export interface RelayTicketClaims {
  aud: typeof RELAY_TICKET_AUDIENCE;
  sub: string;
  room: string;
  iat: number;
  exp: number;
  jti: string;
}

/** Що Web UI отримує від свого сервера для підключення viewer-а. */
export interface RelayViewerAccess {
  url: string;
  room: string;
  workspace: string;
  token: string;
}

/**
 * Кукі пристрою, сполученого дистанційно: HttpOnly на домені Web UI, значення — токен пристрою.
 * Проксі Web UI пропускає в webhooxy лише кукі з префіксом `mc_`.
 */
export const RELAY_DEVICE_COOKIE = 'mc_device';
/** Префікс кукі, які проксі Web UI передає агенту; решта (сесія Web UI) у webhooxy не йде. */
export const RELAY_COOKIE_PREFIX = 'mc_';

/** Відповідь агента на опитування дистанційного сполучення: токен не в тілі, а в кукі `mc_device`. */
export interface RelayPairPoll {
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

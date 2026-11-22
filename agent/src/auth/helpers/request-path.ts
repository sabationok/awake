import type { Request } from 'express';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Яким шляхом прийшов запит. */
export type RequestPath =
  /** Цей Mac (аппка, розробка). */
  | { type: 'loopback' }
  /** `tailscale serve` на окремий порт; `login` — власник пристрою в tailnet, якщо serve його передав. */
  | { type: 'tailnet'; login: string | null }
  /** Інша адреса: LAN. */
  | { type: 'lan' };

/**
 * Tailnet визначає порт, а не заголовок: serve веде на окремий порт, що слухає лише 127.0.0.1. Заголовку
 * `Tailscale-User-Login` вірмо лише там: serve додає його сам і вирізає копії клієнта (для tagged-пристроїв його немає).
 */
export function requestPath(req: Request, tailnetPort: number): RequestPath {
  if (req.socket.localPort === tailnetPort) {
    const login = req.headers['tailscale-user-login'];
    return { type: 'tailnet', login: typeof login === 'string' && login ? login : null };
  }
  return LOOPBACK.has(req.socket.remoteAddress ?? '') ? { type: 'loopback' } : { type: 'lan' };
}

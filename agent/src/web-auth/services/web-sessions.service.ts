import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { WebSessionIdleMinutes, WebSessionInfo } from '@awake/contracts';
import { SESSION_RETENTION_MS } from '../constants/web-auth';
import { WebSessionsRepository } from '../repositories/web-sessions.repository';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export interface ActiveWebSession {
  id: string;
  deviceId: number;
  idleMinutes: WebSessionIdleMinutes;
  expiresAt: string;
}

/**
 * Ковзні вебсесії: opaque-токен у куці `mc_session`, у SQLite лише його sha256. Сесія належить пристрою
 * (`mc_device`) і гасне, коли між запитами минуло більше за вибраний таймаут, при виході або відкликанні пристрою.
 */
@Injectable()
export class WebSessionsService {
  constructor(private readonly _sessions: WebSessionsRepository) {}

  /** Нова сесія пристрою. Повертає токен для куки (лише тут він існує у відкритому вигляді). */
  create(deviceId: number, idleMinutes: WebSessionIdleMinutes): { token: string; session: ActiveWebSession } {
    const now = Date.now();
    this._sessions.prune(new Date(now - SESSION_RETENTION_MS).toISOString());
    const token = randomBytes(32).toString('base64url');
    const id = randomUUID();
    this._sessions.create({ id, tokenHash: sha256(token), deviceId, idleMinutes, at: new Date(now).toISOString() });
    return { token, session: { id, deviceId, idleMinutes, expiresAt: new Date(now + idleMinutes * 60_000).toISOString() } };
  }

  /** Жива сесія цього пристрою; продовжує її. null — немає, чужа, відкликана або протухла. */
  validate(token: string, deviceId: number): ActiveWebSession | null {
    const row = this._sessions.findActive(sha256(token), deviceId);
    if (!row) return null;
    const now = Date.now();
    const idleMs = row.idleMinutes * 60_000;
    if (now - Date.parse(row.lastActiveAt) > idleMs) {
      this._sessions.revoke(row.id, new Date(now).toISOString());
      return null;
    }
    this._sessions.touch(row.id, new Date(now).toISOString());
    return { id: row.id, deviceId: row.deviceId, idleMinutes: row.idleMinutes as WebSessionIdleMinutes, expiresAt: new Date(now + idleMs).toISOString() };
  }

  revoke(id: string) {
    this._sessions.revoke(id, new Date().toISOString());
  }

  /** Таймаут і строк живої сесії за id (без продовження). */
  info(id: string): WebSessionInfo | null {
    const row = this._sessions.findById(id);
    if (!row) return null;
    return { idleMinutes: row.idleMinutes as WebSessionIdleMinutes, expiresAt: new Date(Date.parse(row.lastActiveAt) + row.idleMinutes * 60_000).toISOString() };
  }

  static info(session: ActiveWebSession): WebSessionInfo {
    return { idleMinutes: session.idleMinutes, expiresAt: session.expiresAt };
  }
}

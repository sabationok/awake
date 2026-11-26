import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { WebSessionIdleMinutes, WebSessionInfo } from '@awake/contracts';
import { SESSION_RETENTION_MS } from '../constants/web-auth';
import type { CreateWebSessionDto } from '../dto/create-web-session.dto';
import { WebSessionsRepository } from '../repositories/web-sessions.repository';
import type { ActiveWebSession, CreatedWebSession, ListedWebSession } from '../types/web-session.types';

export type { ActiveWebSession, CreatedWebSession } from '../types/web-session.types';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Ковзні вебсесії: opaque-токен у куці `mc_session`, у SQLite лише його sha256. Сесія належить пристрою
 * (`mc_device`) і гасне, коли між запитами минуло більше за вибраний таймаут, при виході або відкликанні пристрою.
 */
@Injectable()
export class WebSessionsService {
  /** З'явилась або зникла сесія: перебудувати сторінку «Вхід». */
  readonly changed$ = new Subject<void>();

  constructor(private readonly _sessions: WebSessionsRepository) {}

  /** Нова сесія пристрою. Повертає токен для куки (лише тут він існує у відкритому вигляді). */
  create(deviceId: number, idleMinutes: WebSessionIdleMinutes): CreatedWebSession {
    const now = Date.now();
    this._sessions.delete({ staleBefore: new Date(now - SESSION_RETENTION_MS).toISOString() });
    const token = randomBytes(32).toString('base64url');
    const id = randomUUID();
    const at = new Date(now).toISOString();
    const dto: CreateWebSessionDto = { id, tokenHash: sha256(token), deviceId, idleMinutes, createdAt: at, lastActiveAt: at };
    this._sessions.create(dto);
    this.changed$.next();
    return { token, session: { id, deviceId, idleMinutes, expiresAt: new Date(now + idleMinutes * 60_000).toISOString() } };
  }

  /** Жива сесія цього пристрою; продовжує її. null — немає, чужа, відкликана або протухла. */
  validate(token: string, deviceId: number): ActiveWebSession | null {
    const row = this._sessions.findOne({ tokenHash: sha256(token), deviceId, revoked: false });
    if (!row) return null;
    const now = Date.now();
    const idleMs = row.idleMinutes * 60_000;
    if (now - Date.parse(row.lastActiveAt) > idleMs) {
      this._revoke(row.id, new Date(now).toISOString());
      return null;
    }
    this._sessions.update({ id: row.id }, { lastActiveAt: new Date(now).toISOString() });
    return { id: row.id, deviceId: row.deviceId, idleMinutes: row.idleMinutes as WebSessionIdleMinutes, expiresAt: new Date(now + idleMs).toISOString() };
  }

  revoke(id: string) {
    this._revoke(id, new Date().toISOString());
  }

  /** Таймаут і строк живої сесії за id (без продовження). */
  info(id: string): WebSessionInfo | null {
    const row = this._sessions.findOne({ id, revoked: false });
    if (!row) return null;
    return { idleMinutes: row.idleMinutes as WebSessionIdleMinutes, expiresAt: new Date(Date.parse(row.lastActiveAt) + row.idleMinutes * 60_000).toISOString() };
  }

  /** Живі сесії всіх пристроїв, найсвіжіші перші (без продовження). Протухлі за таймаутом сюди не потрапляють. */
  active(): ListedWebSession[] {
    const now = Date.now();
    return this._sessions
      .findMany({ revoked: false }, { order: { lastActiveAt: 'DESC' } })
      .filter((row) => now - Date.parse(row.lastActiveAt) <= row.idleMinutes * 60_000)
      .map((row) => ({
        id: row.id,
        deviceId: row.deviceId,
        lastActiveAt: row.lastActiveAt,
        expiresAt: new Date(Date.parse(row.lastActiveAt) + row.idleMinutes * 60_000).toISOString(),
      }));
  }

  private _revoke(id: string, at: string) {
    if (this._sessions.update({ id, revoked: false }, { revokedAt: at })) this.changed$.next();
  }

  static info(session: ActiveWebSession): WebSessionInfo {
    return { idleMinutes: session.idleMinutes, expiresAt: session.expiresAt };
  }
}

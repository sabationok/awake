import type { WebSessionIdleMinutes } from '@macontrol/contracts';

export interface ActiveWebSession {
  id: string;
  deviceId: number;
  idleMinutes: WebSessionIdleMinutes;
  expiresAt: string;
}

/** Щойно створена сесія: токен для куки існує у відкритому вигляді лише тут. */
export interface CreatedWebSession {
  token: string;
  session: ActiveWebSession;
}

/** Жива сесія в списку на сторінці «Вхід». */
export interface ListedWebSession {
  id: string;
  deviceId: number;
  lastActiveAt: string;
  expiresAt: string;
}

import type { WebSessionIdleMinutes } from '@awake/contracts';

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

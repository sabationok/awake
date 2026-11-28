import type { SessionSource } from '@macontrol/contracts';

/** Сесія Awake, яку веде сервер. Дати — ISO. */
export interface AwakeSession {
  startedAt: string;
  until: string;
  /** Як її замовили: 2h, 30m. */
  duration: string;
  source: SessionSource;
}

/** Сесія Sleeper: коли поставили і коли Mac засне. */
export interface SleeperSession {
  startedAt: string;
  sleepAt: string;
  minutes: number;
  source: SessionSource;
}

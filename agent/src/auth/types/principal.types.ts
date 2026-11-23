import type { Request } from 'express';

/**
 * Хто прийшов. Роут дивиться лише на це, а не на канал:
 * - `agent` — Mac-аппка, розробка (головний токен агента);
 * - `device` — сполучений пристрій з Bearer-токеном (LAN);
 * - `web` — сполучений пристрій з живою вебсесією (кукі `mc_device` + `mc_session`);
 * - `web-device` — лише `mc_device`, без сесії: пускає тільки на вхід паролем.
 */
export type Principal =
  | { kind: 'agent' }
  | { kind: 'device'; deviceId: number }
  | { kind: 'web'; deviceId: number; sessionId: string }
  | { kind: 'web-device'; deviceId: number };

export type PrincipalKind = Principal['kind'];

/** Канал, яким прийшов запит; кожен має свою стратегію guard-а. */
export type AuthStrategyId = 'local' | 'tailscale';

/** Що guard поклав у запит. */
export interface AuthContext {
  strategy: AuthStrategyId;
  principal: Principal | null;
}

export type AuthedRequest = Request & { auth?: AuthContext };

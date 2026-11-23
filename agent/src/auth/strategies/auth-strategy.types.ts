import type { Request } from 'express';
import type { AuthStrategyId, Principal } from '../types/principal.types';

/**
 * Стратегія одного каналу. `matches` впізнає канал за ознакою, яку клієнт не підробить (локальний порт сокета,
 * адреса, транспорт), а не за хедером. `authenticate` перевіряє канал (кидає 403, якщо канал закритий) і повертає,
 * хто прийшов; null — анонім (його пустять лише `@PublicRoute`).
 */
export interface AuthStrategy {
  readonly id: AuthStrategyId;
  /** Кукі-стратегія: без principal клієнт отримує `next` (вхід або сполучення), а не просто 401. */
  readonly usesCookies: boolean;
  matches(req: Request): boolean;
  authenticate(req: Request): Principal | null;
}

/** Bearer з `Authorization`; '' — немає. */
export function readBearer(req: Request): string {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

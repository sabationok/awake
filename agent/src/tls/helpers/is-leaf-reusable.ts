import { existsSync } from 'node:fs';
import { LEAF_RENEW_BEFORE_MS, LEAF_SUBJECT } from '../constants/tls.constants';
import type { LeafIndex } from '../types/tls.types';

/** Кеш придатний, якщо ім'я і список адрес ті самі, файли на місці і сертифікат ще довго не спливає. */
export function isLeafReusable(index: LeafIndex | null, addresses: string[], now: number): index is LeafIndex {
  if (!index) return false;
  if (index.subject !== LEAF_SUBJECT) return false;
  if (index.addresses.join(',') !== addresses.join(',')) return false;
  if (!existsSync(index.keyPath) || !existsSync(index.certPath)) return false;
  return new Date(index.expiresAt).getTime() - now > LEAF_RENEW_BEFORE_MS;
}

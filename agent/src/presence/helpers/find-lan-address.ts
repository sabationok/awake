import { findLanAddresses } from './find-lan-addresses';

/** IPv4-адреса Mac у локальній мережі: перша з findLanAddresses (спершу en0). */
export function findLanAddress(): string | null {
  return findLanAddresses()[0] ?? null;
}

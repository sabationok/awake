import { readFileSync } from 'node:fs';
import { LEAF_VALIDITY_DAYS } from '../constants/tls.constants';
import type { TlsMaterial } from '../types/tls.types';
import { createLeaf } from './create-leaf';
import { ensureCa } from './ensure-ca';
import { isLeafReusable } from './is-leaf-reusable';
import { normalizeAddresses } from './normalize-addresses';
import { readLeafIndex } from './read-leaf-index';
import { writeLeafIndex } from './write-leaf-index';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * CA і серверний сертифікат під поточні LAN-адреси. Перевипускаємо лише коли список змінився
 * або сертифікат скоро спливає; інакше повертаємо кеш з диска.
 */
export function ensureTls(dir: string, addresses: string[]): TlsMaterial {
  ensureCa(dir);
  const wanted = normalizeAddresses(addresses);
  let index = readLeafIndex(dir);
  if (!isLeafReusable(index, wanted, Date.now())) {
    const { keyPath, certPath } = createLeaf(dir, wanted);
    index = {
      addresses: wanted,
      keyPath,
      certPath,
      expiresAt: new Date(Date.now() + LEAF_VALIDITY_DAYS * DAY_MS).toISOString(),
    };
    writeLeafIndex(dir, index);
  }
  return {
    key: readFileSync(index.keyPath),
    cert: readFileSync(index.certPath),
    addresses: wanted,
  };
}

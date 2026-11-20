import { chmodSync } from 'node:fs';
import { runOpenssl } from './run-openssl';

/** EC P-256 ключ; приватний ключ одразу обмежуємо до власника. */
export function generateEcKey(keyPath: string): void {
  runOpenssl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', keyPath]);
  chmodSync(keyPath, 0o600);
}

import { execFileSync } from 'node:child_process';
import { OPENSSL_BIN } from '../constants/tls.constants';

/** Викликає системний openssl без shell: аргументи передаються масивом. */
export function runOpenssl(args: string[]): void {
  execFileSync(OPENSSL_BIN, args, { stdio: 'pipe' });
}

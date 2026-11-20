import { rmSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { LEAF_SUBJECT, LEAF_VALIDITY_DAYS } from '../constants/tls.constants';
import { buildSubjectAltName } from './build-subject-alt-name';
import { generateEcKey } from './generate-ec-key';
import { randomSerial } from './random-serial';
import { runOpenssl } from './run-openssl';
import { writeExtensionFile } from './write-extension-file';

/** Серверний сертифікат, підписаний нашим CA, для поточного списку LAN-адрес. */
export function createLeaf(dir: string, addresses: string[]): { keyPath: string; certPath: string } {
  const keyPath = join(dir, 'leaf.key');
  const csrPath = join(dir, 'leaf.csr');
  const certPath = join(dir, 'leaf.crt');
  const extPath = writeExtensionFile(dir, 'leaf.ext', [
    buildSubjectAltName(addresses, hostname()),
    'basicConstraints=CA:FALSE',
    'keyUsage=critical,digitalSignature',
    'extendedKeyUsage=serverAuth',
    'subjectKeyIdentifier=hash',
    'authorityKeyIdentifier=keyid',
  ]);
  generateEcKey(keyPath);
  runOpenssl(['req', '-new', '-key', keyPath, '-subj', LEAF_SUBJECT, '-out', csrPath]);
  runOpenssl([
    'x509', '-req', '-in', csrPath, '-CA', join(dir, 'ca.crt'), '-CAkey', join(dir, 'ca.key'), '-sha256',
    '-days', String(LEAF_VALIDITY_DAYS), '-set_serial', randomSerial(), '-extfile', extPath, '-out', certPath,
  ]);
  rmSync(csrPath, { force: true });
  rmSync(extPath, { force: true });
  return { keyPath, certPath };
}

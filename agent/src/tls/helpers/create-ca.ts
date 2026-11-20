import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { CA_SUBJECT, CA_VALIDITY_DAYS } from '../constants/tls.constants';
import { generateEcKey } from './generate-ec-key';
import { randomSerial } from './random-serial';
import { runOpenssl } from './run-openssl';
import { writeExtensionFile } from './write-extension-file';

/** Самопідписаний CA: ключ P-256, 10 років, лише для підпису серверних сертифікатів. */
export function createCa(dir: string): void {
  const keyPath = join(dir, 'ca.key');
  const csrPath = join(dir, 'ca.csr');
  const certPath = join(dir, 'ca.crt');
  const extPath = writeExtensionFile(dir, 'ca.ext', [
    'basicConstraints=critical,CA:TRUE',
    'keyUsage=critical,keyCertSign,cRLSign',
    'subjectKeyIdentifier=hash',
  ]);
  generateEcKey(keyPath);
  runOpenssl(['req', '-new', '-key', keyPath, '-subj', CA_SUBJECT, '-out', csrPath]);
  runOpenssl([
    'x509', '-req', '-in', csrPath, '-signkey', keyPath, '-sha256',
    '-days', String(CA_VALIDITY_DAYS), '-set_serial', randomSerial(), '-extfile', extPath, '-out', certPath,
  ]);
  rmSync(csrPath, { force: true });
  rmSync(extPath, { force: true });
}

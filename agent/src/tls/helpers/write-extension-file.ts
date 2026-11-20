import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LibreSSL на macOS не має -addext для x509 -req, тож v3-розширення пишемо в тимчасовий файл.
 * Рядки без секції: openssl бере їх як секцію за замовчуванням.
 */
export function writeExtensionFile(dir: string, name: string, lines: string[]): string {
  const path = join(dir, name);
  writeFileSync(path, `${lines.join('\n')}\n`, { mode: 0o600 });
  return path;
}

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createCa } from './create-ca';

/** Створює локальний CA один раз; далі використовуємо наявний. */
export function ensureCa(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (existsSync(join(dir, 'ca.key')) && existsSync(join(dir, 'ca.crt'))) return;
  createCa(dir);
}

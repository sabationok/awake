import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LeafIndex } from '../types/tls.types';

/** leaf.json з попереднього запуску або null, якщо його ще немає чи він зіпсований. */
export function readLeafIndex(dir: string): LeafIndex | null {
  try {
    return JSON.parse(readFileSync(join(dir, 'leaf.json'), 'utf8')) as LeafIndex;
  } catch {
    return null;
  }
}

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LeafIndex } from '../types/tls.types';

export function writeLeafIndex(dir: string, index: LeafIndex): void {
  writeFileSync(join(dir, 'leaf.json'), `${JSON.stringify(index, null, 2)}\n`);
}

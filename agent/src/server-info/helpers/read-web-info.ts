import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { ServerWebInfo } from '@macontrol/contracts';

function builtAt(dir: string): string | null {
  try {
    return statSync(join(dir, 'index.html')).mtime.toISOString();
  } catch {
    return null;
  }
}

/** Яку збірку Web UI зараз віддасть express.static: опубліковану, якщо в ній є index.html, інакше з бандла. */
export function readWebInfo(publishedDir: string, bundleDir: string | null): ServerWebInfo {
  const published = builtAt(publishedDir);
  if (published) return { source: 'published', dir: publishedDir, builtAt: published };
  const bundled = bundleDir ? builtAt(bundleDir) : null;
  if (bundleDir && bundled) return { source: 'bundle', dir: bundleDir, builtAt: bundled };
  return { source: null, dir: null, builtAt: null };
}

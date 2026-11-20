import type { NextConfig } from 'next';
import { join } from 'node:path';

/**
 * Дві збірки з одного коду.
 * - vercel (за замовчуванням): сервер читає стан з Upstash, вхід за паролем. Файли *.vercel.tsx / *.vercel.ts.
 * - local: статичний експорт, який роздає агент на Mac; дані й команди йдуть у його API. Файли *.local.tsx.
 * Спільні файли без суфікса потрапляють в обидві.
 */
const local = process.env.BUILD_TARGET === 'local';

const config: NextConfig = {
  pageExtensions: local ? ['local.tsx', 'tsx', 'ts'] : ['vercel.tsx', 'vercel.ts', 'tsx', 'ts'],
  output: local ? 'export' : undefined,
  // Статичний експорт лягає в distDir: його копіює build-agent.sh у бандл Mac-аппки.
  distDir: local ? 'out' : '.next',
  outputFileTracingRoot: join(__dirname, '..'),
  transpilePackages: ['@awake/contracts'],
  env: { NEXT_PUBLIC_BUILD_TARGET: local ? 'local' : 'vercel' },
};

export default config;

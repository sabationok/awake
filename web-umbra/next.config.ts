import type { NextConfig } from 'next';
import { join } from 'node:path';

/**
 * Дві збірки з одного коду, як у web.
 * - vercel (за замовчуванням): Next-сервер, дерево читає route handler з Upstash, клієнт лише показує його. Файли *.vercel.tsx / *.vercel.ts.
 * - local: статичний експорт, який роздає агент на Mac; дерево й події йдуть у його API на тому ж origin. Файли *.local.tsx.
 * Спільні файли без суфікса потрапляють в обидві.
 */
const local = process.env.BUILD_TARGET === 'local';

const config: NextConfig = {
  pageExtensions: local ? ['local.tsx', 'tsx', 'ts'] : ['vercel.tsx', 'vercel.ts', 'tsx', 'ts'],
  output: local ? 'export' : undefined,
  // Статику роздає express.static агента: `/app/login/` → `app/login/index.html`, без підбору `.html`.
  trailingSlash: local,
  distDir: local ? 'out' : '.next',
  outputFileTracingRoot: join(__dirname, '..'),
  transpilePackages: ['@awake/contracts'],
  env: { NEXT_PUBLIC_BUILD_TARGET: local ? 'local' : 'vercel' },
  // Лівий нижній кут займає наш dev-індикатор (src/shell/dev-build-indicator.tsx); значок Next — праворуч.
  devIndicators: { position: 'bottom-right' },
  // `@awake/contracts` — сирий TS. Скомпільований поруч `*.js` (CommonJS після випадкового tsc) не має перекрити
  // `*.ts`: у браузері він падає з `exports is not defined`. Тому TS раніше за JS.
  webpack: (cfg) => {
    const ext: string[] = cfg.resolve.extensions ?? [];
    cfg.resolve.extensions = ['.tsx', '.ts', ...ext.filter((e) => e !== '.tsx' && e !== '.ts')];
    return cfg;
  },
};

export default config;

import type { NextConfig } from 'next';
import { join } from 'node:path';

/**
 * Дві збірки з одного коду, як у web.
 * - vercel (за замовчуванням): Next-сервер, індекс і сторінки читають route handlers з Upstash, клієнт лише показує його.
 *   Файли *.vercel.tsx і route handlers `route.ts`. Без суфікса, бо Next 15.5 не генерує client-reference-manifest
 *   для `route.vercel.ts`, а трейс на нього посилається, і деплой на Vercel падає з ENOENT.
 * - local: статичний експорт, який роздає агент на Mac; індекс, сторінки й події йдуть у його API на тому ж origin.
 *   Файли *.local.tsx; `.ts` у `app/` (route handlers) сюди не потрапляють.
 * Спільні файли — `.tsx` без суфікса (layout, `manifest.tsx`), вони потрапляють в обидві.
 */
const local = process.env.BUILD_TARGET === 'local';

const config: NextConfig = {
  pageExtensions: local ? ['local.tsx', 'tsx'] : ['vercel.tsx', 'tsx', 'ts'],
  output: local ? 'export' : undefined,
  // Статику роздає express.static агента: `/app/login/` → `app/login/index.html`, без підбору `.html`.
  trailingSlash: local,
  distDir: local ? 'out' : '.next',
  outputFileTracingRoot: join(__dirname, '..'),
  transpilePackages: ['@macontrol/contracts'],
  env: { NEXT_PUBLIC_BUILD_TARGET: local ? 'local' : 'vercel' },
  // Лівий нижній кут займає наш dev-індикатор (src/shell/dev-build-indicator.tsx); значок Next — праворуч.
  devIndicators: { position: 'bottom-right' },
  // `@macontrol/contracts` — сирий TS. Скомпільований поруч `*.js` (CommonJS після випадкового tsc) не має перекрити
  // `*.ts`: у браузері він падає з `exports is not defined`. Тому TS раніше за JS.
  webpack: (cfg) => {
    const ext: string[] = cfg.resolve.extensions ?? [];
    cfg.resolve.extensions = ['.tsx', '.ts', ...ext.filter((e) => e !== '.tsx' && e !== '.ts')];
    return cfg;
  },
};

export default config;

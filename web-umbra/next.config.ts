import type { NextConfig } from 'next';
import { join } from 'node:path';

/** Next-сервер на Vercel: дерево читає route handler з Upstash, клієнт лише рендерить і нічого не надсилає. */
const config: NextConfig = {
  outputFileTracingRoot: join(__dirname, '..'),
  transpilePackages: ['@awake/contracts'],
  // Лівий нижній кут займає наш dev-індикатор (src/shell/dev-build-indicator.tsx); значок Next — праворуч.
  devIndicators: { position: 'bottom-right' },
};

export default config;

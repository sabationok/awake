// Next 15.5 з pageExtensions `route.vercel.ts` вписує `route_client-reference-manifest.js` у .nft.json роуту,
// але сам файл не створює; збірка Vercel тоді падає на lstat. Роут-хендлерам маніфест не потрібен,
// тож кладемо порожню заглушку для кожного відсутнього. Прибрати, коли Next виправить.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = '.next/server/app';
const stub = 'globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\n';
let made = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.nft.json')) {
      for (const file of JSON.parse(readFileSync(path, 'utf8')).files) {
        if (!file.endsWith('_client-reference-manifest.js')) continue;
        const target = join(dirname(path), file);
        if (!existsSync(target)) {
          writeFileSync(target, stub);
          made++;
        }
      }
    }
  }
}

if (existsSync(root)) walk(root);
if (made) console.info(`[stub-route-manifests] ${made} stub(s)`);

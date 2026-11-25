// tsc уже вписав метадані декораторів, тож esbuild лише склеює все в один файл для Mac-аппки.
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Необов'язкові пакети Nest, які він підтягує лише якщо вони встановлені.
const optional = [
  '@nestjs/microservices', '@nestjs/microservices/*', '@nestjs/websockets', '@nestjs/websockets/*',
  'class-validator', 'class-transformer', 'class-transformer/storage', '@fastify/static', '@nestjs/platform-fastify',
];

/**
 * `@nest-kit/*` (shim майбутніх пакетів кіта) → скомпільований `dist/tsc/nest-kit/*`. tsc не переписує alias,
 * а без плагіна esbuild за `paths` з tsconfig узяв би `.ts` з `src` — без метаданих декораторів, і DI Nest зламався б.
 */
const nestKitShim = {
  name: 'nest-kit-shim',
  setup(builder) {
    builder.onResolve({ filter: /^@nest-kit\// }, (args) => {
      const base = resolve('dist/tsc/nest-kit', args.path.slice('@nest-kit/'.length));
      const file = existsSync(`${base}.js`) ? `${base}.js` : resolve(base, 'index.js');
      if (!existsSync(file)) return { errors: [{ text: `nest-kit shim not compiled: ${args.path}` }] };
      return { path: file };
    });
  },
};

await build({
  entryPoints: ['dist/tsc/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/agent.cjs',
  external: optional,
  plugins: [nestKitShim],
  legalComments: 'none',
  // node-fetch у Telegraf перевіряє signal за іменем класу; без keepNames esbuild перейменовує AbortSignal.
  keepNames: true,
  logLevel: 'warning',
});
console.log('bundled dist/agent.cjs');

// tsc уже вписав метадані декораторів, тож esbuild лише склеює все в один файл для Mac-аппки.
import { build } from 'esbuild';

// Необов'язкові пакети Nest, які він підтягує лише якщо вони встановлені.
const optional = [
  '@nestjs/microservices', '@nestjs/microservices/*', '@nestjs/websockets', '@nestjs/websockets/*',
  'class-validator', 'class-transformer', 'class-transformer/storage', '@fastify/static', '@nestjs/platform-fastify',
];

await build({
  entryPoints: ['dist/tsc/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/agent.cjs',
  external: optional,
  legalComments: 'none',
  logLevel: 'warning',
});
console.log('bundled dist/agent.cjs');

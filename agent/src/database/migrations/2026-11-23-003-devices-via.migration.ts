import { defineMigration } from '@nest-kit/sqlite';

/** Канал, через який сполучено пристрій. */
export const devicesViaMigration = defineMigration({
  name: '2026-11-23-003-devices-via',
  up: (ctx) => ctx.addColumnIfMissing('devices', 'via', "TEXT NOT NULL DEFAULT 'local'"),
  down: (ctx) => ctx.dropColumnIfExists('devices', 'via'),
});

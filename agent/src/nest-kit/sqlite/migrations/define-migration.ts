// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { MigrationObject } from './types/migration.types';

/** Міграція без DI. Лише типізує об'єкт; ім'я перевіряє runner. */
export function defineMigration(migration: MigrationObject): MigrationObject {
  return migration;
}

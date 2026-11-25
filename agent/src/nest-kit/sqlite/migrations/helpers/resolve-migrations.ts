// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import { getMigrationName } from '../decorators/migration.decorator';
import type { MigrationEntry, MigrationInterface, MigrationObject, ResolvedMigration } from '../types/migration.types';

const isMigrationClass = (entry: MigrationEntry): entry is Type<MigrationInterface> => typeof entry === 'function';

/** Класи з опцій модуля — їх Nest інстанціює провайдерами. */
export function pickMigrationClasses(entries: MigrationEntry[]): Type<MigrationInterface>[] {
  return entries.filter(isMigrationClass);
}

/**
 * Записи модуля → імена й інстанси, відсортовані за іменем. `instances` — у тому ж порядку, що й `pickMigrationClasses`.
 * Порожнє чи повторене ім'я — помилка старту.
 */
export function resolveMigrations(entries: MigrationEntry[], instances: MigrationInterface[]): ResolvedMigration[] {
  let next = 0;
  const resolved = entries.map((entry): ResolvedMigration => {
    if (!isMigrationClass(entry)) return { name: (entry as MigrationObject).name, migration: entry };
    const name = getMigrationName(entry);
    if (!name) throw new Error(`Migration class ${entry.name} has no @Migration(name)`);
    return { name, migration: instances[next++] };
  });
  const seen = new Set<string>();
  for (const { name } of resolved) {
    if (!name) throw new Error('Migration without a name');
    if (seen.has(name)) throw new Error(`Duplicate migration name: ${name}`);
    seen.add(name);
  }
  return resolved.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

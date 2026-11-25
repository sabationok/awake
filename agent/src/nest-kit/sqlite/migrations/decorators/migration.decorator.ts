// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { Injectable, type Type } from '@nestjs/common';
import { SQLITE_MIGRATION_NAME } from '../../constants/sqlite-tokens';

/**
 * Клас міграції з DI. Ім'я — ключ у `_migrations` і порядок виконання (`2026-11-23-001-baseline`).
 * Клас не може інжектити `SqliteDataSource` чи репозиторії: міграції виконуються, поки DataSource ще створюється.
 * БД — через `ctx`.
 */
export function Migration(name: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SQLITE_MIGRATION_NAME, name, target);
    Injectable()(target);
  };
}

export function getMigrationName(target: Type<unknown>): string | undefined {
  return Reflect.getMetadata(SQLITE_MIGRATION_NAME, target) as string | undefined;
}

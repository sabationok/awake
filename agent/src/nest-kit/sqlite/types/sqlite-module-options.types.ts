// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { InjectionToken, ModuleMetadata, OptionalFactoryDependency } from '@nestjs/common';
import type { MigrationEntry } from '../migrations/types/migration.types';

export interface SqliteModuleOptions {
  /** Шлях до файлу БД або `:memory:`. Директорія створюється при відкритті. */
  path: string;
  /** `PRAGMA <key> = <value>` при відкритті, поза транзакціями (WAL у транзакції не вмикається). */
  pragmas?: Record<string, string | number>;
}

export interface SqliteModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (...args: any[]) => SqliteModuleOptions | Promise<SqliteModuleOptions>;
  /**
   * Класи (з DI, `@Migration(name)`) і об'єкти (`defineMigration`, без DI) в одному масиві.
   * Порядок виконання — за `name`, не за позицією тут.
   */
  migrations?: MigrationEntry[];
}

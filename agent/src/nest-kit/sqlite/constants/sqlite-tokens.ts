// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** Опції `SqliteModule.forRootAsync` після `useFactory`. */
export const SQLITE_MODULE_OPTIONS = Symbol('SQLITE_MODULE_OPTIONS');

/** Міграції з опцій модуля, уже з іменами й інстансами класів. */
export const SQLITE_MIGRATIONS = Symbol('SQLITE_MIGRATIONS');

/** Ключ метаданих `@Migration(name)` на класі міграції. */
export const SQLITE_MIGRATION_NAME = Symbol('SQLITE_MIGRATION_NAME');

/** Таблиця виконаних міграцій. */
export const SQLITE_MIGRATIONS_TABLE = '_migrations';

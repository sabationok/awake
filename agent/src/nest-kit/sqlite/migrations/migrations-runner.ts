// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { Logger } from '@nestjs/common';
import { SQLITE_MIGRATIONS_TABLE } from '../constants/sqlite-tokens';
import type { SqliteDataSource } from '../data-source/sqlite-data-source';
import { MigrationContext } from './migration-context';
import type { AppliedMigration, ResolvedMigration, RevertMigrationsOptions } from './types/migration.types';

/**
 * Виконує й відкочує міграції. Кожна — у своїй транзакції разом із рядком у `_migrations`:
 * помилка відкочує і зміни, і запис, а агент не стартує на напівміграній схемі.
 */
export class MigrationsRunner {
  private readonly _logger = new Logger('SqliteMigrations');
  private readonly _ctx: MigrationContext;
  readonly dataSource: SqliteDataSource;

  constructor(
    private readonly _dataSource: SqliteDataSource,
    private readonly _migrations: ResolvedMigration[],
  ) {
    this._ctx = new MigrationContext(_dataSource);
    this.dataSource = _dataSource;
    this._dataSource.exec(
      `CREATE TABLE IF NOT EXISTS ${SQLITE_MIGRATIONS_TABLE} (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`,
    );
  }

  findApplied(): AppliedMigration[] {
    return this._dataSource.query<AppliedMigration>(
      `SELECT name, applied_at AS appliedAt FROM ${SQLITE_MIGRATIONS_TABLE} ORDER BY name`,
    );
  }

  findPending(): ResolvedMigration[] {
    const applied = new Set(this.findApplied().map((row) => row.name));
    return this._migrations.filter((entry) => !applied.has(entry.name));
  }

  /** Усі невиконані за зростанням імені. Повертає імена виконаних. */
  up(): string[] {
    const known = new Set(this._migrations.map((entry) => entry.name));
    const unknown = this.findApplied().filter((row) => !known.has(row.name));
    if (unknown.length) this._logger.warn(`applied but not registered: ${unknown.map((row) => row.name).join(', ')}`);

    const done: string[] = [];
    for (const { name, migration } of this.findPending()) {
      this._dataSource.transaction(() => {
        this._run(name, () => migration.up(this._ctx));
        this._dataSource
          .prepare(`INSERT INTO ${SQLITE_MIGRATIONS_TABLE} (name, applied_at) VALUES (?, ?)`)
          .run(name, new Date().toISOString());
      });
      this._logger.log(`up ${name}`);
      done.push(name);
    }
    return done;
  }

  /** Відкочує з кінця. Повертає імена відкочених; міграція без `down` зупиняє відкат помилкою. */
  down(options: RevertMigrationsOptions = {}): string[] {
    const byName = new Map(this._migrations.map((entry) => [entry.name, entry.migration]));
    if (options.to !== undefined && !byName.has(options.to)) throw new Error(`Unknown migration: ${options.to}`);
    const applied = this.findApplied().reverse();
    const targets = options.to !== undefined ? applied.filter((row) => row.name > options.to!) : applied.slice(0, options.steps ?? 1);

    const done: string[] = [];
    for (const { name } of targets) {
      const migration = byName.get(name);
      if (!migration) throw new Error(`Cannot revert ${name}: not registered`);
      if (!migration.down) throw new Error(`Cannot revert ${name}: no down()`);
      this._dataSource.transaction(() => {
        this._run(name, () => migration.down!(this._ctx));
        this._dataSource.prepare(`DELETE FROM ${SQLITE_MIGRATIONS_TABLE} WHERE name = ?`).run(name);
      });
      this._logger.log(`down ${name}`);
      done.push(name);
    }
    return done;
  }

  private _run(name: string, step: () => unknown) {
    const result = step();
    if (typeof (result as PromiseLike<unknown> | undefined)?.then === 'function') {
      throw new Error(`Migration ${name} returned a Promise; migrations over node:sqlite must be synchronous`);
    }
  }
}

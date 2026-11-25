// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { MigrationsRunner } from './migrations-runner';
import type { AppliedMigration, RevertMigrationsOptions } from './types/migration.types';

/** Стан і відкат міграцій для dev-команд. Невиконані міграції запускає сам модуль при старті. */
export class MigrationsService {
  constructor(private readonly _runner: MigrationsRunner) {}

  findApplied(): AppliedMigration[] {
    return this._runner.findApplied();
  }

  findPendingNames(): string[] {
    return this._runner.findPending().map((entry) => entry.name);
  }

  revert(options?: RevertMigrationsOptions): string[] {
    return this._runner.down(options);
  }
}

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { type DynamicModule, Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { SQLITE_MIGRATIONS, SQLITE_MODULE_OPTIONS } from './constants/sqlite-tokens';
import { SqliteDataSource } from './data-source/sqlite-data-source';
import { pickMigrationClasses, resolveMigrations } from './migrations/helpers/resolve-migrations';
import { MigrationsRunner } from './migrations/migrations-runner';
import { MigrationsService } from './migrations/migrations.service';
import type { MigrationInterface, ResolvedMigration } from './migrations/types/migration.types';
import type { SqliteModuleAsyncOptions, SqliteModuleOptions } from './types/sqlite-module-options.types';

@Global()
@Module({})
export class SqliteModule implements OnApplicationShutdown {
  constructor(private readonly _dataSource: SqliteDataSource) {}

  /**
   * Одне з'єднання на застосунок. DataSource з'являється вже мігрованим: невиконані міграції йдуть у його factory,
   * тож будь-який провайдер бачить актуальну схему ще в конструкторі.
   */
  static forRootAsync(options: SqliteModuleAsyncOptions): DynamicModule {
    const entries = options.migrations ?? [];
    const classes = pickMigrationClasses(entries);
    return {
      module: SqliteModule,
      imports: options.imports ?? [],
      providers: [
        { provide: SQLITE_MODULE_OPTIONS, useFactory: options.useFactory, inject: options.inject ?? [] },
        ...classes,
        {
          provide: SQLITE_MIGRATIONS,
          useFactory: (...instances: MigrationInterface[]) => resolveMigrations(entries, instances),
          inject: classes,
        },
        {
          provide: MigrationsRunner,
          useFactory: (moduleOptions: SqliteModuleOptions, migrations: ResolvedMigration[]) => {
            const runner = new MigrationsRunner(new SqliteDataSource(moduleOptions), migrations);
            runner.up();
            return runner;
          },
          inject: [SQLITE_MODULE_OPTIONS, SQLITE_MIGRATIONS],
        },
        { provide: SqliteDataSource, useFactory: (runner: MigrationsRunner) => runner.dataSource, inject: [MigrationsRunner] },
        { provide: MigrationsService, useFactory: (runner: MigrationsRunner) => new MigrationsService(runner), inject: [MigrationsRunner] },
      ],
      exports: [SqliteDataSource, MigrationsService],
    };
  }

  /** Остання фаза зупинки: у beforeApplicationShutdown інші ще пишуть (зокрема flush статистики). */
  onApplicationShutdown() {
    this._dataSource.close();
  }
}

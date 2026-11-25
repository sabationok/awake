// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
export { SqliteModule } from './sqlite.module';
export { SqliteDataSource } from './data-source/sqlite-data-source';

export { Entity } from './decorators/entity.decorator';
export { Column } from './decorators/column.decorator';
export { PrimaryColumn } from './decorators/primary-column.decorator';
export { PrimaryGeneratedColumn } from './decorators/primary-generated-column.decorator';
export { CreateDateColumn } from './decorators/create-date-column.decorator';
export { UpdateDateColumn } from './decorators/update-date-column.decorator';
export { StateDateColumn } from './decorators/state-date-column.decorator';
export { DeleteDateColumn } from './decorators/delete-date-column.decorator';
export { Index } from './decorators/index.decorator';
export { ManyToOne } from './decorators/many-to-one.decorator';
export { OneToOne } from './decorators/one-to-one.decorator';
export { OneToMany } from './decorators/one-to-many.decorator';
export { EntityRepository } from './decorators/entity-repository.decorator';
export type { ColumnOptions, ColumnTransformer, ColumnType } from './metadata/types/entity-meta.types';

export * from './operators';
export { FindManyQueryBase } from './query/find-many-query.base';
export { HasPaginationQuery, PaginationQuery } from './query/pagination.query';
export { IdQuery } from './query/id.query';

export { SqliteRepository } from './repository/sqlite-repository';
export type { SqliteWhereQuery } from './repository/sqlite-repository';
export type { OrderOf, RelationsOf, SelectOf, SqliteFindOpts, SqliteUpsertOpts } from './repository/types/find-opts.types';
export { SqliteQueryBuilder } from './query-builder/sqlite-query-builder';
export { SqliteWhereBuilder } from './query-builder/sqlite-where-builder';

export { Migration } from './migrations/decorators/migration.decorator';
export { defineMigration } from './migrations/define-migration';
export { MigrationContext } from './migrations/migration-context';
export { MigrationsService } from './migrations/migrations.service';
export type {
  AppliedMigration,
  MigrationEntry,
  MigrationInterface,
  MigrationObject,
  RevertMigrationsOptions,
} from './migrations/types/migration.types';
export type { SqliteModuleAsyncOptions, SqliteModuleOptions } from './types/sqlite-module-options.types';

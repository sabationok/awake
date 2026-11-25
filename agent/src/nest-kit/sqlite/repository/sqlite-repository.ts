// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SqliteDataSource } from '../data-source/sqlite-data-source';
import { getRepositoryEntity } from '../decorators/entity-repository.decorator';
import { getEntityMeta } from '../metadata/metadata-storage';
import type { ColumnMeta, EntityMeta } from '../metadata/types/entity-meta.types';
import { IsNull } from '../operators/is-null';
import { Not } from '../operators/not';
import { FIND_MANY_TRAIT_KEYS } from '../query/find-many-query.base';
import type { FindManyQueryBase } from '../query/find-many-query.base';
import { SqliteQueryBuilder } from '../query-builder/sqlite-query-builder';
import type { SqliteWhereBuilder } from '../query-builder/sqlite-where-builder';
import { toDbValue } from './helpers/column-value';
import { quoteIdentifier as q } from './helpers/quote-identifier';
import type { OrderDirection, SqliteFindOpts, SqliteUpsertOpts } from './types/find-opts.types';

/** Умова змін і підрахунку: будь-яке поле query-класів репозиторію. */
export type SqliteWhereQuery<QForOne, QForMany> = Partial<QForOne> & Partial<QForMany>;

/**
 * Базовий репозиторій: `BaseRepository<E, QForOne, QForMany>` скіла поверх `node:sqlite`.
 * Публічний API лише цей; фільтри — поля query-класів, особливі — в override `_applyWhere`. SQL-тексту в модулі немає:
 * що не вкладається в параметри — через `_qb()`.
 */
@Injectable()
export abstract class SqliteRepository<E extends object, QForOne extends object, QForMany extends FindManyQueryBase = FindManyQueryBase> {
  protected readonly _meta: EntityMeta;

  constructor(@Inject(SqliteDataSource) protected readonly _dataSource: SqliteDataSource) {
    this._meta = getEntityMeta(getRepositoryEntity(this.constructor));
  }

  findOne(query: QForOne, opts?: SqliteFindOpts<E>): E | null {
    return this._find(query, opts).getOne();
  }

  findOneOrFail(query: QForOne, opts?: SqliteFindOpts<E>): E {
    const entity = this.findOne(query, opts);
    if (!entity) throw new Error(`${this._meta.target.name} not found`);
    return entity;
  }

  /** Без `pagination` — усі рядки. */
  findMany(query: QForMany, opts?: SqliteFindOpts<E>): E[] {
    const builder = this._find(query, opts);
    if (query.pagination) builder.limit(query.pagination.limit).offset(query.pagination.offset);
    return builder.getMany();
  }

  count(query: SqliteWhereQuery<QForOne, QForMany>, opts?: Pick<SqliteFindOpts<E>, 'withDeleted' | 'onlyDeleted'>): number {
    return this._find(query, opts).getCount();
  }

  exists(query: SqliteWhereQuery<QForOne, QForMany>, opts?: Pick<SqliteFindOpts<E>, 'withDeleted' | 'onlyDeleted'>): boolean {
    return this._find(query, opts).exists();
  }

  /** INSERT; `increment` id — з lastInsertRowid, `uuid` — згенерований, `CreateDateColumn` — зараз, якщо не дали. */
  create(dto: Partial<E>): E {
    const values = this._insertValues(dto);
    const columns = [...values.keys()];
    const { lastInsertRowid } = this._dataSource.run(
      `INSERT INTO ${q(this._meta.table)} (${columns.map((column) => q(column.name)).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      ...columns.map((column) => toDbValue(column, values.get(column))),
    );
    const entity = Object.assign(Object.create(this._meta.target.prototype), dto) as Record<string, unknown>;
    for (const [column, value] of values) entity[column.property] = value;
    const increment = this._meta.columns.find((column) => column.generated === 'increment');
    if (increment && entity[increment.property] === undefined) entity[increment.property] = lastInsertRowid;
    return entity as E;
  }

  createMany(dtos: Partial<E>[]): E[] {
    return this._dataSource.transaction(() => dtos.map((dto) => this.create(dto)));
  }

  /** Повертає кількість змінених рядків. Soft-deleted не змінюються. */
  update(query: SqliteWhereQuery<QForOne, QForMany>, dto: Partial<E>): number {
    return this._where(query).update(dto);
  }

  /**
   * INSERT … ON CONFLICT: без `update` — `DO NOTHING`. Повертає кількість змінених рядків (0 — конфлікт без оновлення).
   */
  upsert(dto: Partial<E>, opts: SqliteUpsertOpts<E>): number {
    const values = this._insertValues(dto);
    const columns = [...values.keys()];
    const conflict = opts.conflict.map((property) => q(this._column(property).name)).join(', ');
    const update = opts.update?.length
      ? `DO UPDATE SET ${opts.update.map((property) => `${q(this._column(property).name)} = excluded.${q(this._column(property).name)}`).join(', ')}`
      : 'DO NOTHING';
    return this._dataSource.run(
      `INSERT INTO ${q(this._meta.table)} (${columns.map((column) => q(column.name)).join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ON CONFLICT (${conflict}) ${update}`,
      ...columns.map((column) => toDbValue(column, values.get(column))),
    ).changes;
  }

  /** Soft delete, якщо в entity є `@DeleteDateColumn`; інакше фізичне. Повертає кількість. */
  delete(query: SqliteWhereQuery<QForOne, QForMany>): number {
    const builder = this._where(query);
    return this._hasSoftDelete() ? builder.softDelete() : builder.delete();
  }

  restore(query: SqliteWhereQuery<QForOne, QForMany>): number {
    return this._where(query).restore();
  }

  /** Фізичне DELETE, разом із soft-deleted. Окремий метод, щоб його не викликати випадково через `delete`. */
  hardDelete(query: SqliteWhereQuery<QForOne, QForMany>): number {
    return this._where(query).withDeleted().delete();
  }

  /**
   * Поля query → умови. Колонка — рівність / оператор; `<state>: boolean` для `@StateDateColumn` `<state>At` —
   * `IS [NOT] NULL`. Інше поле — помилка: його має забрати override до `super._applyWhere`.
   */
  protected _applyWhere(where: SqliteWhereBuilder<E>, query: SqliteWhereQuery<QForOne, QForMany>): void {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || (FIND_MANY_TRAIT_KEYS as readonly string[]).includes(key)) continue;
      if (this._meta.columns.some((column) => column.property === key)) {
        where.field(key as keyof E & string, value);
        continue;
      }
      const state = this._meta.columns.find((column) => column.role === 'state-date' && column.property === `${key}At`);
      if (state && typeof value === 'boolean') {
        where.field(state.property as keyof E & string, value ? Not(IsNull()) : IsNull());
        continue;
      }
      throw new Error(`${this._meta.target.name}: query field "${key}" is not a column; handle it in _applyWhere`);
    }
  }

  /** «qb lite» над цією entity: `applyQuery` іде через `_applyWhere` цього репозиторію. */
  protected _qb(alias: string): SqliteQueryBuilder<E> {
    return new SqliteQueryBuilder<E>(this._dataSource, this._meta, alias, (where, query) =>
      this._applyWhere(where, query as SqliteWhereQuery<QForOne, QForMany>),
    );
  }

  /** Синхронна транзакція; вкладена — savepoint. */
  protected _transaction<T>(fn: () => T): T {
    return this._dataSource.transaction(fn);
  }

  private _find(query: object, opts?: SqliteFindOpts<E>): SqliteQueryBuilder<E> {
    const builder = this._qb(this._meta.table).applyQuery(query);
    if (opts?.withDeleted) builder.withDeleted();
    if (opts?.onlyDeleted) builder.onlyDeleted();
    builder.selectFields(opts?.select).relations(opts?.relations);
    for (const [field, direction] of Object.entries(opts?.order ?? {})) builder.orderBy(field, direction as OrderDirection);
    return builder;
  }

  private _where(query: object): SqliteQueryBuilder<E> {
    return this._qb(this._meta.table).applyQuery(query);
  }

  private _hasSoftDelete(): boolean {
    return this._meta.columns.some((column) => column.role === 'delete-date');
  }

  private _column(property: string): ColumnMeta {
    const column = this._meta.columns.find((existing) => existing.property === property);
    if (!column) throw new Error(`${this._meta.target.name}.${property} is not a column`);
    return column;
  }

  private _insertValues(dto: Partial<E>): Map<ColumnMeta, unknown> {
    const values = new Map<ColumnMeta, unknown>();
    const source = dto as Record<string, unknown>;
    for (const column of this._meta.columns) {
      let value = source[column.property];
      if (value === undefined && column.generated === 'uuid') value = randomUUID();
      if (value === undefined && column.role === 'create-date') value = new Date().toISOString();
      if (value !== undefined) values.set(column, value);
    }
    for (const key of Object.keys(source)) {
      const known = this._meta.columns.some((column) => column.property === key) || this._meta.relations.some((relation) => relation.property === key);
      if (!known) throw new Error(`${this._meta.target.name}: "${key}" is not a column`);
    }
    return values;
  }
}

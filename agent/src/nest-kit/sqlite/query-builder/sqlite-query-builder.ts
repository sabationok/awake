// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { SQLInputValue } from 'node:sqlite';
import type { SqliteDataSource } from '../data-source/sqlite-data-source';
import { getEntityMeta } from '../metadata/metadata-storage';
import type { ColumnMeta, EntityMeta } from '../metadata/types/entity-meta.types';
import { assertOrderDirection } from '../helpers/assert-order-direction';
import { assertRowCount } from '../helpers/assert-row-count';
import { In } from '../operators/in';
import { compileCondition } from '../repository/helpers/compile-condition';
import { fromDbValue, toDbValue } from '../repository/helpers/column-value';
import { quoteIdentifier as q } from '../repository/helpers/quote-identifier';
import { findColumn, findRelation, inverseOwner, primaryColumn } from '../repository/helpers/relation-target';
import type { DeletedMode, OrderDirection, RelationsOf } from '../repository/types/find-opts.types';
import type { SqlFragment } from '../repository/types/sql-fragment.types';
import { normalizeRelations } from './helpers/normalize-relations';
import type { JoinType, QuerySource, RelationTree, ResolvedField } from './types/query-builder.types';
import { SqliteWhereBuilder } from './sqlite-where-builder';

type ApplyQuery<E> = (where: SqliteWhereBuilder<E>, query: object) => void;

interface RawSelect {
  sql: string;
  as: string;
  column?: ColumnMeta;
}

/**
 * «qb lite» для того, що не вкладається в параметри репозиторію: агрегати, групування, `json_each`, join за relation.
 * Поля — імена властивостей entity (`'m.periodStart'`), SQL і параметри будує builder; тексту SQL зовні немає.
 */
export class SqliteQueryBuilder<E> {
  private readonly _sources = new Map<string, QuerySource>();
  /** Шлях relation (`device`, `device.owner`) → alias приєднаної таблиці. */
  private readonly _joinAliases = new Map<string, string>();
  private readonly _joins: SqlFragment[] = [];
  private readonly _conditions: SqlFragment[] = [];
  private readonly _rawSelect: RawSelect[] = [];
  private readonly _groupBy: string[] = [];
  private readonly _order: string[] = [];
  private _rootSelect?: string[];
  private _relations: RelationTree = {};
  private _limit?: number;
  private _offset?: number;
  private _deleted: DeletedMode = 'exclude';

  constructor(
    private readonly _dataSource: SqliteDataSource,
    readonly meta: EntityMeta,
    readonly alias: string,
    private readonly _applyQuery?: ApplyQuery<E>,
  ) {
    this._sources.set(alias, { alias, kind: 'root', meta });
  }

  // ── умови ──────────────────────────────────────────────

  where(field: (keyof E & string) | `${string}.${string}`, value: unknown): this {
    new SqliteWhereBuilder<E>(this, this._conditions).field(field, value);
    return this;
  }

  andWhere(field: (keyof E & string) | `${string}.${string}`, value: unknown): this {
    return this.where(field, value);
  }

  orWhere(...groups: ((where: SqliteWhereBuilder<E>) => void)[]): this {
    new SqliteWhereBuilder<E>(this, this._conditions).or(...groups);
    return this;
  }

  /** Query-клас репозиторію через його `_applyWhere` — ті самі правила, що в `findMany`. */
  applyQuery(query: object): this {
    if (!this._applyQuery) throw new Error('applyQuery needs a builder from a repository (_qb)');
    this._applyQuery(new SqliteWhereBuilder<E>(this, this._conditions), query);
    return this;
  }

  withDeleted(): this {
    this._deleted = 'with';
    return this;
  }

  onlyDeleted(): this {
    this._deleted = 'only';
    return this;
  }

  // ── джерела ────────────────────────────────────────────

  /** `json_each(<field>) AS alias` з колонками `key` / `value` (`'v.key'`, `'v.value'`). */
  jsonEach(alias: string, field: string): this {
    const { expr } = this.resolveField(field);
    this._addSource({ alias, kind: 'json' });
    this._joins.push({ sql: `JOIN json_each(${expr}) AS ${q(alias)}`, params: [] });
    return this;
  }

  innerJoin(relation: string, alias: string): this {
    this.ensureJoin(relation, 'INNER', alias);
    return this;
  }

  leftJoin(relation: string, alias: string): this {
    this.ensureJoin(relation, 'LEFT', alias);
    return this;
  }

  // ── вибірка ────────────────────────────────────────────

  /** Поля кореня для `getMany` / `getOne`; первинний ключ додається завжди. */
  selectFields(properties: string[] | undefined): this {
    this._rootSelect = properties;
    return this;
  }

  /** Relations для `getMany` / `getOne`: to-one — LEFT JOIN, to-many — другий запит. */
  relations(spec: RelationsOf<E> | undefined): this {
    this._relations = normalizeRelations(spec);
    return this;
  }

  /** Сирі поля для `getRawMany`: `{ periodStart: 'm.periodStart', value: 'v.key' }`. */
  select(map: Record<string, string>): this {
    for (const [as, field] of Object.entries(map)) {
      const { expr, column } = this.resolveField(field);
      this._rawSelect.push({ sql: expr, as, column });
    }
    return this;
  }

  sum(field: string, as: string): this {
    return this._aggregate('SUM', field, as);
  }

  min(field: string, as: string): this {
    return this._aggregate('MIN', field, as);
  }

  max(field: string, as: string): this {
    return this._aggregate('MAX', field, as);
  }

  count(as: string): this {
    this._rawSelect.push({ sql: 'COUNT(*)', as });
    return this;
  }

  groupBy(...fields: string[]): this {
    this._groupBy.push(...fields.map((field) => this.resolveField(field).expr));
    return this;
  }

  /** Поле entity або alias сирої вибірки (`orderBy('count', 'DESC')`). */
  orderBy(field: string, direction: OrderDirection = 'ASC'): this {
    const raw = this._rawSelect.find((select) => select.as === field);
    this._order.push(`${raw ? q(raw.as) : this.resolveField(field).expr} ${assertOrderDirection(direction)}`);
    return this;
  }

  limit(limit: number | undefined): this {
    this._limit = assertRowCount('limit', limit);
    return this;
  }

  offset(offset: number | undefined): this {
    this._offset = assertRowCount('offset', offset);
    return this;
  }

  // ── результати ─────────────────────────────────────────

  getMany(): E[] {
    const loaded = this._joinRelationTree(this._relations, '', this.alias, this.meta);
    const columns = [...this._entityColumns(this.alias, this.meta, this._rootSelect), ...loaded.flatMap(({ alias, meta }) => this._entityColumns(alias, meta))];
    const sql = `SELECT ${columns.map((column) => column.sql).join(', ')} ${this._fromWhere().sql}${this._tail()}`;
    const rows = this._dataSource.query<Record<string, unknown>>(sql, ...this._fromWhere().params);
    const entities = rows.map((row) => this._mapRow(row, loaded));
    this._loadToMany(entities as object[], this.meta, this._relations);
    return entities;
  }

  getOne(): E | null {
    return this.limit(1).getMany()[0] ?? null;
  }

  getRawMany<R>(): R[] {
    if (!this._rawSelect.length) throw new Error('getRawMany needs select() / sum() / count()');
    const { sql, params } = this._fromWhere();
    const select = this._rawSelect.map((raw) => `${raw.sql} AS ${q(raw.as)}`).join(', ');
    const groupBy = this._groupBy.length ? ` GROUP BY ${this._groupBy.join(', ')}` : '';
    const rows = this._dataSource.query<Record<string, unknown>>(`SELECT ${select} ${sql}${groupBy}${this._tail()}`, ...params);
    return rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const raw of this._rawSelect) {
        const value = row[raw.as];
        out[raw.as] = raw.column ? fromDbValue(raw.column, value) : typeof value === 'bigint' ? Number(value) : value;
      }
      return out as R;
    });
  }

  getCount(): number {
    const { sql, params } = this._fromWhere();
    return Number(this._dataSource.query<{ n: number }>(`SELECT COUNT(*) AS n ${sql}`, ...params)[0].n);
  }

  exists(): boolean {
    const { sql, params } = this._fromWhere();
    return this._dataSource.query(`SELECT 1 ${sql} LIMIT 1`, ...params).length > 0;
  }

  // ── масові зміни на тих самих умовах ───────────────────

  /** Оновлює рядки, що підпадають під умови. `UpdateDateColumn` ставиться сам. Повертає кількість змінених. */
  update(dto: Partial<E>): number {
    const assignments = this._assignments(dto as Record<string, unknown>);
    const updated = this.meta.columns.find((column) => column.role === 'update-date');
    if (updated && !assignments.some((assignment) => assignment.column === updated)) {
      assignments.push({ column: updated, value: new Date().toISOString() });
    }
    if (!assignments.length) return 0;
    return this._mutate(
      `UPDATE ${q(this.meta.table)} SET ${assignments.map(({ column }) => `${q(column.name)} = ?`).join(', ')}`,
      assignments.map(({ column, value }) => toDbValue(column, value)),
    );
  }

  /** Фізичне видалення. */
  delete(): number {
    return this._mutate(`DELETE FROM ${q(this.meta.table)}`, []);
  }

  softDelete(): number {
    const column = this._deleteDateColumn();
    return this._mutate(`UPDATE ${q(this.meta.table)} SET ${q(column.name)} = ?`, [new Date().toISOString()]);
  }

  restore(): number {
    const column = this._deleteDateColumn();
    this._deleted = 'only';
    return this._mutate(`UPDATE ${q(this.meta.table)} SET ${q(column.name)} = NULL`, []);
  }

  // ── для SqliteWhereBuilder ─────────────────────────────

  /** @internal `'startedAt'` → корінь; `'d.userAgent'` → джерело `d`; `'v.key'` → колонка `json_each`. */
  resolveField(field: string): ResolvedField {
    const dot = field.indexOf('.');
    const source = dot > 0 ? this._sources.get(field.slice(0, dot)) : undefined;
    const alias = source ? source.alias : this.alias;
    const property = source ? field.slice(dot + 1) : field;
    const resolved = source ?? this._sources.get(this.alias)!;
    if (resolved.kind === 'json') {
      if (property !== 'key' && property !== 'value') throw new Error(`json_each ${alias} has only key / value, got ${property}`);
      return { expr: `${q(alias)}.${property}` };
    }
    const column = findColumn(resolved.meta!, property);
    return { expr: `${q(alias)}.${q(column.name)}`, column };
  }

  /** @internal Приєднує to-one relation за шляхом від кореня (`device`, `device.owner`); повертає alias. */
  ensureJoin(path: string, type: JoinType, alias?: string): string {
    const existing = this._joinAliases.get(path);
    if (existing) return existing;
    const dot = path.lastIndexOf('.');
    const parentAlias = dot > 0 ? this.ensureJoin(path.slice(0, dot), type) : this.alias;
    const parentMeta = this._sources.get(parentAlias)!.meta!;
    const property = dot > 0 ? path.slice(dot + 1) : path;
    const relation = findRelation(parentMeta, property);
    if (relation.type === 'one-to-many') throw new Error(`${parentMeta.target.name}.${property}: one-to-many is loaded by relations(), not joined`);

    const childAlias = alias ?? path.replace(/\./g, '__');
    let childMeta: EntityMeta;
    let on: string;
    if (relation.joinColumn) {
      childMeta = getEntityMeta(relation.target());
      on = `${q(childAlias)}.${q(primaryColumn(childMeta).name)} = ${q(parentAlias)}.${q(findColumn(parentMeta, relation.joinColumn).name)}`;
    } else {
      const { meta, owner } = inverseOwner(relation);
      childMeta = meta;
      on = `${q(childAlias)}.${q(findColumn(meta, owner.joinColumn!).name)} = ${q(parentAlias)}.${q(primaryColumn(parentMeta).name)}`;
    }
    const deleted = childMeta.columns.find((column) => column.role === 'delete-date');
    if (deleted && this._deleted !== 'with') on += ` AND ${q(childAlias)}.${q(deleted.name)} IS NULL`;

    this._addSource({ alias: childAlias, kind: 'join', meta: childMeta });
    this._joins.push({ sql: `${type} JOIN ${q(childMeta.table)} AS ${q(childAlias)} ON ${on}`, params: [] });
    this._joinAliases.set(path, childAlias);
    return childAlias;
  }

  // ── внутрішнє ──────────────────────────────────────────

  private _addSource(source: QuerySource) {
    if (this._sources.has(source.alias)) throw new Error(`alias ${source.alias} is already used in this query`);
    this._sources.set(source.alias, source);
  }

  private _aggregate(fn: string, field: string, as: string): this {
    this._rawSelect.push({ sql: `${fn}(${this.resolveField(field).expr})`, as });
    return this;
  }

  private _deleteDateColumn(): ColumnMeta {
    const column = this.meta.columns.find((existing) => existing.role === 'delete-date');
    if (!column) throw new Error(`${this.meta.target.name} has no @DeleteDateColumn`);
    return column;
  }

  private _fromWhere(): SqlFragment {
    const conditions = [...this._conditions];
    const deleted = this.meta.columns.find((column) => column.role === 'delete-date');
    if (deleted && this._deleted !== 'with') {
      conditions.push({ sql: `${q(this.alias)}.${q(deleted.name)} IS ${this._deleted === 'only' ? 'NOT ' : ''}NULL`, params: [] });
    }
    const joins = this._joins.map((join) => join.sql).join(' ');
    const where = conditions.length ? ` WHERE ${conditions.map((condition) => `(${condition.sql})`).join(' AND ')}` : '';
    return {
      sql: `FROM ${q(this.meta.table)} AS ${q(this.alias)}${joins ? ` ${joins}` : ''}${where}`,
      params: [...this._joins.flatMap((join) => join.params), ...conditions.flatMap((condition) => condition.params)],
    };
  }

  private _tail(): string {
    let tail = this._order.length ? ` ORDER BY ${this._order.join(', ')}` : '';
    if (this._limit !== undefined || this._offset !== undefined) tail += ` LIMIT ${this._limit ?? -1}`;
    if (this._offset !== undefined) tail += ` OFFSET ${this._offset}`;
    return tail;
  }

  /** UPDATE / DELETE за `rowid IN (SELECT ...)`: умови, join, ORDER / LIMIT працюють так само, як у вибірці. */
  private _mutate(head: string, headParams: SQLInputValue[]): number {
    if (!this._conditions.length && this._limit === undefined && this._offset === undefined) {
      throw new Error(`${this.meta.target.name}: update / delete without conditions`);
    }
    const { sql, params } = this._fromWhere();
    const subquery = `SELECT ${q(this.alias)}.rowid ${sql}${this._tail()}`;
    return this._dataSource.run(`${head} WHERE rowid IN (${subquery})`, ...headParams, ...params).changes;
  }

  private _assignments(dto: Record<string, unknown>): { column: ColumnMeta; value: unknown }[] {
    const assignments: { column: ColumnMeta; value: unknown }[] = [];
    for (const [property, value] of Object.entries(dto)) {
      if (value === undefined) continue;
      if (this.meta.relations.some((relation) => relation.property === property)) continue;
      assignments.push({ column: findColumn(this.meta, property), value });
    }
    return assignments;
  }

  private _entityColumns(alias: string, meta: EntityMeta, properties?: string[]): { sql: string }[] {
    const primary = meta.columns.filter((column) => column.primary).map((column) => column.property);
    const wanted = properties ? new Set([...primary, ...properties]) : undefined;
    return meta.columns
      .filter((column) => !wanted || wanted.has(column.property))
      .map((column) => ({ sql: `${q(alias)}.${q(column.name)} AS ${q(`${alias}::${column.property}`)}` }));
  }

  /** to-one з дерева relations → LEFT JOIN; повертає приєднані джерела для мапінгу. */
  private _joinRelationTree(tree: RelationTree, prefix: string, parentAlias: string, parentMeta: EntityMeta): { path: string; alias: string; meta: EntityMeta }[] {
    const loaded: { path: string; alias: string; meta: EntityMeta }[] = [];
    for (const [property, subtree] of Object.entries(tree)) {
      const relation = findRelation(parentMeta, property);
      if (relation.type === 'one-to-many') continue;
      const path = prefix ? `${prefix}.${property}` : property;
      const alias = this.ensureJoin(path, 'LEFT', `rel__${path.replace(/\./g, '__')}`);
      const meta = this._sources.get(alias)!.meta!;
      loaded.push({ path, alias, meta }, ...this._joinRelationTree(subtree, path, alias, meta));
    }
    return loaded;
  }

  private _buildEntity(row: Record<string, unknown>, alias: string, meta: EntityMeta): object | null {
    const entity = Object.create(meta.target.prototype) as Record<string, unknown>;
    let present = false;
    for (const column of meta.columns) {
      const key = `${alias}::${column.property}`;
      if (!(key in row)) continue;
      entity[column.property] = fromDbValue(column, row[key]);
      if (column.primary && row[key] !== null) present = true;
    }
    return present ? entity : null;
  }

  private _mapRow(row: Record<string, unknown>, loaded: { path: string; alias: string; meta: EntityMeta }[]): E {
    const root = this._buildEntity(row, this.alias, this.meta) as Record<string, unknown>;
    const byPath = new Map<string, Record<string, unknown> | null>([['', root]]);
    for (const { path, alias, meta } of loaded) {
      const dot = path.lastIndexOf('.');
      const parent = byPath.get(dot > 0 ? path.slice(0, dot) : '');
      const child = parent ? (this._buildEntity(row, alias, meta) as Record<string, unknown> | null) : null;
      if (parent) parent[dot > 0 ? path.slice(dot + 1) : path] = child;
      byPath.set(path, child);
    }
    return root as E;
  }

  /** to-many другим запитом `WHERE fk IN (ids)`, рекурсивно і всередині вже приєднаних to-one. */
  private _loadToMany(entities: object[], meta: EntityMeta, tree: RelationTree) {
    if (!entities.length) return;
    for (const [property, subtree] of Object.entries(tree)) {
      const relation = findRelation(meta, property);
      if (relation.type !== 'one-to-many') {
        const children = entities.map((entity) => (entity as Record<string, unknown>)[property]).filter(Boolean) as object[];
        this._loadToMany(children, getEntityMeta(relation.target()), subtree);
        continue;
      }
      const { meta: childMeta, owner } = inverseOwner(relation);
      const parentKey = primaryColumn(meta).property;
      const ids = entities.map((entity) => (entity as Record<string, unknown>)[parentKey]);
      const childBuilder = new SqliteQueryBuilder<Record<string, unknown>>(this._dataSource, childMeta, 'c').where(owner.joinColumn!, In(ids));
      if (this._deleted === 'with') childBuilder.withDeleted();
      const nested = Object.fromEntries(Object.entries(subtree));
      childBuilder._relations = nested;
      const groups = new Map<unknown, unknown[]>();
      for (const child of childBuilder.getMany()) {
        const key = child[owner.joinColumn!];
        groups.set(key, [...(groups.get(key) ?? []), child]);
      }
      for (const entity of entities) (entity as Record<string, unknown>)[property] = groups.get((entity as Record<string, unknown>)[parentKey]) ?? [];
    }
  }
}

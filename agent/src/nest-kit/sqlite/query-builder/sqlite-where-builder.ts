// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { compileCondition } from '../repository/helpers/compile-condition';
import type { SqlFragment } from '../repository/types/sql-fragment.types';
import type { SqliteQueryBuilder } from './sqlite-query-builder';

/**
 * Умови запиту по полях entity. Отримує його `_applyWhere` репозиторію; SQL-тексту зовні немає:
 * лише поле і значення / find-оператор. `undefined` — умову пропущено.
 */
export class SqliteWhereBuilder<E> {
  constructor(
    private readonly _qb: SqliteQueryBuilder<any>,
    private readonly _parts: SqlFragment[],
  ) {}

  /** Поле кореня (`'startedAt'`) або джерела запиту (`'d.userAgent'`). */
  field(field: (keyof E & string) | `${string}.${string}`, value: unknown): this {
    if (value === undefined) return this;
    const { expr, column } = this._qb.resolveField(field);
    this._parts.push(compileCondition(expr, value, column));
    return this;
  }

  /** Поле to-one relation кореня: сам додає LEFT JOIN (`joined('device', 'userAgent', ILike('%mac%'))`). */
  joined(relation: string, property: string, value: unknown): this {
    if (value === undefined) return this;
    const alias = this._qb.ensureJoin(relation, 'LEFT');
    return this.field(`${alias}.${property}`, value);
  }

  /** `(група) OR (група)`; умови всередині групи — через AND. Порожні групи пропускаються. */
  or(...groups: ((where: SqliteWhereBuilder<E>) => void)[]): this {
    const compiled = groups
      .map((group) => {
        const parts: SqlFragment[] = [];
        group(new SqliteWhereBuilder<E>(this._qb, parts));
        return parts;
      })
      .filter((parts) => parts.length)
      .map((parts) => ({ sql: parts.map((part) => `(${part.sql})`).join(' AND '), params: parts.flatMap((part) => part.params) }));
    if (compiled.length) {
      this._parts.push({ sql: compiled.map((part) => `(${part.sql})`).join(' OR '), params: compiled.flatMap((part) => part.params) });
    }
    return this;
  }
}

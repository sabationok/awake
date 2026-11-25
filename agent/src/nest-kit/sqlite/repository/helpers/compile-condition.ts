// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { SQLInputValue } from 'node:sqlite';
import { FindOperator, isFindOperator } from '../../operators/find-operator';
import type { ColumnMeta } from '../../metadata/types/entity-meta.types';
import { toDbValue } from './column-value';
import type { SqlFragment } from '../types/sql-fragment.types';

const COMPARISON = { lessThan: '<', lessThanOrEqual: '<=', moreThan: '>', moreThanOrEqual: '>=' } as const;

/**
 * Одна умова на вираз колонки: голе значення → `=`, `null` → `IS NULL`, масив → `IN`, оператор → його SQL.
 * Єдиний компілятор для query-класів, `_applyWhere` і query builder.
 */
export function compileCondition(expr: string, value: unknown, column?: ColumnMeta): SqlFragment {
  const param = (v: unknown): SQLInputValue => toDbValue(column, v);
  if (value === null) return { sql: `${expr} IS NULL`, params: [] };
  if (Array.isArray(value)) return compileIn(expr, value.map(param));
  if (!isFindOperator(value)) return { sql: `${expr} = ?`, params: [param(value)] };

  const op = value as FindOperator<unknown>;
  switch (op.type) {
    case 'equal':
      return compileCondition(expr, op.value ?? null, column);
    case 'isNull':
      return { sql: `${expr} IS NULL`, params: [] };
    case 'in':
      return compileIn(expr, (op.value as unknown[]).map(param));
    case 'between': {
      const [from, to] = op.value as [unknown, unknown];
      return { sql: `${expr} >= ? AND ${expr} <= ?`, params: [param(from), param(to)] };
    }
    case 'lessThan':
    case 'lessThanOrEqual':
    case 'moreThan':
    case 'moreThanOrEqual':
      return { sql: `${expr} ${COMPARISON[op.type]} ?`, params: [param(op.value)] };
    case 'like':
    case 'ilike':
      return { sql: `ts_like(?, ${expr}, ${op.type === 'ilike' ? 1 : 0}) = 1`, params: [String(op.value)] };
    case 'not': {
      if (op.value === null || op.value === undefined) return { sql: `${expr} IS NOT NULL`, params: [] };
      if (!isFindOperator(op.value) && !Array.isArray(op.value)) return { sql: `${expr} != ?`, params: [param(op.value)] };
      const inner = compileCondition(expr, op.value, column);
      return { sql: `NOT (${inner.sql})`, params: inner.params };
    }
    case 'and': {
      const parts = (op.value as FindOperator<unknown>[]).map((inner) => compileCondition(expr, inner, column));
      return { sql: parts.map((part) => `(${part.sql})`).join(' AND '), params: parts.flatMap((part) => part.params) };
    }
  }
}

function compileIn(expr: string, params: SQLInputValue[]): SqlFragment {
  if (!params.length) return { sql: '0 = 1', params: [] };
  return { sql: `${expr} IN (${params.map(() => '?').join(', ')})`, params };
}

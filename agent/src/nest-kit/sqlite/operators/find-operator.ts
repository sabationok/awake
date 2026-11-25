// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

export type FindOperatorType =
  | 'equal' | 'not' | 'isNull' | 'in' | 'between'
  | 'lessThan' | 'lessThanOrEqual' | 'moreThan' | 'moreThanOrEqual'
  | 'like' | 'ilike' | 'and';

/** Умова на поле, що не є голою рівністю. Компілює її лише пакет (`compileCondition`). */
export class FindOperator<T> {
  constructor(
    readonly type: FindOperatorType,
    readonly value?: T | T[] | FindOperator<T> | FindOperator<T>[],
  ) {}
}

/** Значення поля в query: голе значення, `null` (IS NULL), масив (IN) або оператор. */
export type FindValue<T> = T | null | T[] | FindOperator<T>;

export const isFindOperator = (value: unknown): value is FindOperator<unknown> => value instanceof FindOperator;

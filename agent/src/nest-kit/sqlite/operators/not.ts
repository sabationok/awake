// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** `Not(v)` → `!= v`; `Not(op)` → `NOT (op)`: `Not(IsNull())`, `Not(In([...]))`, `Not(Like(...))`. */
export const Not = <T>(value: T | FindOperator<T>) => new FindOperator<T>('not', value);

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** Кілька умов на одне поле: `And(MoreThan(a), Not(b))`. */
export const And = <T>(...operators: FindOperator<T>[]) => new FindOperator<T>('and', operators);

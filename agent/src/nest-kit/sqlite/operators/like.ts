// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** З урахуванням регістру; `%` і `_` — як у SQL. */
export const Like = (pattern: string) => new FindOperator<string>('like', pattern);

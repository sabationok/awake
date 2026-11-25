// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** Без урахування регістру, включно з кирилицею (вбудований LIKE SQLite її не знає). */
export const ILike = (pattern: string) => new FindOperator<string>('ilike', pattern);

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const IsNull = <T = never>() => new FindOperator<T>('isNull');

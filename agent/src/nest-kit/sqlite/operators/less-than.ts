// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const LessThan = <T>(value: T) => new FindOperator<T>('lessThan', value);

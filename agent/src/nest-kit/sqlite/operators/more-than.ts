// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const MoreThan = <T>(value: T) => new FindOperator<T>('moreThan', value);

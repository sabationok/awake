// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const MoreThanOrEqual = <T>(value: T) => new FindOperator<T>('moreThanOrEqual', value);

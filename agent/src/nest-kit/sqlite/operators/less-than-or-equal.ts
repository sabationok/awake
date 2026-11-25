// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const LessThanOrEqual = <T>(value: T) => new FindOperator<T>('lessThanOrEqual', value);

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

export const Equal = <T>(value: T) => new FindOperator<T>('equal', value);

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** Порожній масив — завжди false, не синтаксична помилка. */
export const In = <T>(values: T[]) => new FindOperator<T>('in', values);

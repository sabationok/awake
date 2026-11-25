// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { FindOperator } from './find-operator';

/** Включно з обох боків. */
export const Between = <T>(from: T, to: T) => new FindOperator<T>('between', [from, to]);

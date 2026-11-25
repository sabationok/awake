// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { SQLInputValue } from 'node:sqlite';

/** Шматок SQL з параметрами в тому ж порядку, що й `?`. Живе лише всередині пакета. */
export interface SqlFragment {
  sql: string;
  params: SQLInputValue[];
}

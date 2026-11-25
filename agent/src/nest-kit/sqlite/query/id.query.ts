// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** Запит одного рядка за первинним ключем. */
export class IdQuery<T extends number | string = number> {
  id!: T;
}

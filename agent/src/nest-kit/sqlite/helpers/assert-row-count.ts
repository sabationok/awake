// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** `LIMIT` / `OFFSET` ідуть у текст SQL: лише ціле невід'ємне число в межах safe integer. */
export function assertRowCount(name: 'limit' | 'offset', value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${name}: ${String(value)}`);
  return value;
}

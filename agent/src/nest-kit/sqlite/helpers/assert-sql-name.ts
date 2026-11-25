// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

const SQL_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Ім'я таблиці / колонки / pragma, яке йде в текст SQL без лапок: лише `[A-Za-z_][A-Za-z0-9_]*`. */
export function assertSqlName(kind: string, name: string): string {
  if (!SQL_NAME.test(name)) throw new Error(`Invalid ${kind} name: ${name}`);
  return name;
}

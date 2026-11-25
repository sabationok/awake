// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** `startedAt` → `started_at`: ім'я колонки за замовчуванням. */
export function toSnakeCase(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

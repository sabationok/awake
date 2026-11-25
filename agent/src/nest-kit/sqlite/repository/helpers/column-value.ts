// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { SQLInputValue } from 'node:sqlite';
import type { ColumnMeta } from '../../metadata/types/entity-meta.types';

/** Значення поля entity → параметр SQLite: boolean → 0/1, json → текст, Date → ISO, свій transformer. */
export function toDbValue(column: ColumnMeta | undefined, value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (column?.transformer) return column.transformer.to(value);
  if (column?.type === 'json') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value as SQLInputValue;
}

/** Значення з SQLite → поле entity. */
export function fromDbValue(column: ColumnMeta, value: unknown): unknown {
  if (column.transformer) return column.transformer.from(value);
  if (value === null || value === undefined) return null;
  if (column.type === 'boolean') return value === 1 || value === 1n;
  if (column.type === 'json') return JSON.parse(String(value));
  if (typeof value === 'bigint') return Number(value);
  return value;
}

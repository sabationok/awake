// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { OrderDirection } from '../repository/types/find-opts.types';

const DIRECTIONS: readonly string[] = ['ASC', 'DESC'];

/** Напрямок іде в текст SQL, тож у рантаймі — лише `ASC` / `DESC` (тип TS не захищає від даних з HTTP). */
export function assertOrderDirection(direction: unknown): OrderDirection {
  const upper = typeof direction === 'string' ? direction.toUpperCase() : direction;
  if (typeof upper !== 'string' || !DIRECTIONS.includes(upper)) throw new Error(`Invalid order direction: ${String(direction)}`);
  return upper as OrderDirection;
}

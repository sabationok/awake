// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { defineColumn } from './column.decorator';

/** `increment` — INTEGER AUTOINCREMENT, id з lastInsertRowid; `uuid` — TEXT, `randomUUID()` при create. */
export function PrimaryGeneratedColumn(strategy: 'increment' | 'uuid' = 'increment', name?: string): PropertyDecorator {
  return defineColumn({ type: strategy === 'uuid' ? 'text' : 'integer', name }, { primary: true, generated: strategy });
}

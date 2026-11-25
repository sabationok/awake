// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { defineColumn } from './column.decorator';

/** Soft delete: `delete` ставить час, пошук виключає такі рядки, поки не попросили `withDeleted`. */
export function DeleteDateColumn(name?: string): PropertyDecorator {
  return defineColumn({ type: 'text', name, nullable: true }, { role: 'delete-date' });
}

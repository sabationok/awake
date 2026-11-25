// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { defineColumn } from './column.decorator';

/** ISO-час останньої зміни; NULL після create, база ставить його в кожному `update`. */
export function UpdateDateColumn(name?: string): PropertyDecorator {
  return defineColumn({ type: 'text', name, nullable: true }, { role: 'update-date' });
}

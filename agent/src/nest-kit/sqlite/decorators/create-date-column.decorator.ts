// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { defineColumn } from './column.decorator';

/** ISO-час створення; база ставить його в `create`, якщо DTO його не дав. */
export function CreateDateColumn(name?: string): PropertyDecorator {
  return defineColumn({ type: 'text', name }, { role: 'create-date' });
}

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { ColumnOptions } from '../metadata/types/entity-meta.types';
import { defineColumn } from './column.decorator';

/** Природний ключ (`ssid`). Кілька полів з ним — складений ключ. */
export function PrimaryColumn(options: ColumnOptions = { type: 'text' }): PropertyDecorator {
  return defineColumn(options, { primary: true });
}

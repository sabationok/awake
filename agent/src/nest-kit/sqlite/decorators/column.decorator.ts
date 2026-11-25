// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { addColumnMeta } from '../metadata/metadata-storage';
import { toSnakeCase } from '../metadata/helpers/to-snake-case';
import type { ColumnMeta, ColumnOptions, ColumnRole } from '../metadata/types/entity-meta.types';

/** Спільна частина декораторів колонок. Тип задається явно: без `emitDecoratorMetadata`. */
export function defineColumn(options: ColumnOptions, extra: Partial<Pick<ColumnMeta, 'primary' | 'generated' | 'role'>> = {}): PropertyDecorator {
  return (target, property) => {
    addColumnMeta(target.constructor, {
      property: String(property),
      name: options.name ?? toSnakeCase(String(property)),
      type: options.type,
      nullable: options.nullable ?? false,
      transformer: options.transformer,
      primary: extra.primary ?? false,
      generated: extra.generated,
      role: extra.role ?? ('regular' as ColumnRole),
    });
  };
}

export function Column(options: ColumnOptions): PropertyDecorator {
  return defineColumn(options);
}

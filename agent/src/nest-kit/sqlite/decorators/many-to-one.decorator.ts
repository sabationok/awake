// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import { addRelationMeta } from '../metadata/metadata-storage';
import type { RelationMeta } from '../metadata/types/entity-meta.types';

/** Власник зв'язку: `joinColumn` — поле цієї entity з FK (`deviceId`). Завантажується LEFT JOIN. */
export function ManyToOne<T>(target: () => Type<T>, options: { joinColumn: string; onDelete?: RelationMeta['onDelete'] }): PropertyDecorator {
  return (entity, property) =>
    addRelationMeta(entity.constructor, { property: String(property), type: 'many-to-one', target, joinColumn: options.joinColumn, onDelete: options.onDelete });
}

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import { addRelationMeta } from '../metadata/metadata-storage';

/** Зворотна сторона `ManyToOne`. Завантажується другим запитом `WHERE fk IN (...)`, не JOIN. */
export function OneToMany<T>(target: () => Type<T>, inverse: (entity: T) => unknown): PropertyDecorator {
  return (entity, property) => addRelationMeta(entity.constructor, { property: String(property), type: 'one-to-many', target, inverse });
}

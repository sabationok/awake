// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import { addRelationMeta } from '../metadata/metadata-storage';
import type { RelationMeta } from '../metadata/types/entity-meta.types';

/** З `joinColumn` — власник (FK тут); без нього — зворотна сторона, `inverse` вказує на relation-власника. */
export function OneToOne<T>(
  target: () => Type<T>,
  options: { joinColumn: string; onDelete?: RelationMeta['onDelete'] } | { inverse: (entity: T) => unknown },
): PropertyDecorator {
  return (entity, property) =>
    addRelationMeta(entity.constructor, {
      property: String(property),
      type: 'one-to-one',
      target,
      ...('joinColumn' in options ? { joinColumn: options.joinColumn, onDelete: options.onDelete } : { inverse: options.inverse }),
    });
}

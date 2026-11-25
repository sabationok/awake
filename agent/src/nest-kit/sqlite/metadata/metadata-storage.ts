// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { Type } from '@nestjs/common';
import type { ColumnMeta, EntityMeta, IndexMeta, RelationMeta } from './types/entity-meta.types';

interface PendingMeta {
  table?: string;
  columns: ColumnMeta[];
  relations: RelationMeta[];
  indexes: IndexMeta[];
}

/**
 * Метадані entity. Декоратори полів спрацьовують раніше за `@Entity`, тож вони пишуть у чернетку класу,
 * а `@Entity` дає їй ім'я таблиці. Читання — лише через `getEntityMeta`, який вимагає `@Entity`.
 */
const storage = new WeakMap<Function, PendingMeta>();

function draftOf(target: Function): PendingMeta {
  let draft = storage.get(target);
  if (!draft) {
    draft = { columns: [], relations: [], indexes: [] };
    storage.set(target, draft);
  }
  return draft;
}

export function addColumnMeta(target: Function, column: ColumnMeta) {
  const draft = draftOf(target);
  if (draft.columns.some((existing) => existing.property === column.property)) {
    throw new Error(`${target.name}.${column.property}: column declared twice`);
  }
  draft.columns.push(column);
}

export function addRelationMeta(target: Function, relation: RelationMeta) {
  draftOf(target).relations.push(relation);
}

export function addIndexMeta(target: Function, index: IndexMeta) {
  draftOf(target).indexes.push(index);
}

export function setEntityTable(target: Function, table: string) {
  draftOf(target).table = table;
}

export function getEntityMeta(target: Function): EntityMeta {
  const draft = storage.get(target);
  if (!draft?.table) throw new Error(`${target.name} is not an @Entity`);
  return { target: target as Type<unknown>, table: draft.table, columns: draft.columns, relations: draft.relations, indexes: draft.indexes };
}

// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { getEntityMeta } from '../../metadata/metadata-storage';
import type { ColumnMeta, EntityMeta, RelationMeta } from '../../metadata/types/entity-meta.types';
import { resolveInverseProperty } from './resolve-inverse-property';

export function findRelation(meta: EntityMeta, property: string): RelationMeta {
  const relation = meta.relations.find((existing) => existing.property === property);
  if (!relation) throw new Error(`${meta.target.name}.${property} is not a relation`);
  return relation;
}

export function findColumn(meta: EntityMeta, property: string): ColumnMeta {
  const column = meta.columns.find((existing) => existing.property === property);
  if (!column) throw new Error(`${meta.target.name}.${property} is not a column`);
  return column;
}

export function primaryColumn(meta: EntityMeta): ColumnMeta {
  const primary = meta.columns.filter((column) => column.primary);
  if (primary.length !== 1) throw new Error(`${meta.target.name}: relations need exactly one primary column`);
  return primary[0];
}

/** Зворотна relation на дочірній entity, що тримає FK (`(session) => session.device` → її ManyToOne). */
export function inverseOwner(relation: RelationMeta): { meta: EntityMeta; owner: RelationMeta } {
  const meta = getEntityMeta(relation.target());
  const owner = findRelation(meta, resolveInverseProperty(relation.inverse!));
  if (!owner.joinColumn) throw new Error(`${meta.target.name}.${owner.property}: inverse side must own the join column`);
  return { meta, owner };
}

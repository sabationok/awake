// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { ColumnMeta, EntityMeta } from '../../metadata/types/entity-meta.types';

/** Джерело у FROM: корінь, приєднана relation або `json_each`. */
export interface QuerySource {
  alias: string;
  kind: 'root' | 'join' | 'json';
  meta?: EntityMeta;
}

/** Вираз поля, готовий до SQL, і колонка, якщо це колонка entity (для перетворення значень). */
export interface ResolvedField {
  expr: string;
  column?: ColumnMeta;
}

/** Нормалізоване дерево relations: `{ device: { webSessions: {} } }`. */
export interface RelationTree {
  [property: string]: RelationTree;
}

export type JoinType = 'LEFT' | 'INNER';

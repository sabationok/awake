// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { RelationsOf } from '../../repository/types/find-opts.types';
import type { RelationTree } from '../types/query-builder.types';

const MAX_DEPTH = 3;

/** `['device']` / `{ device: { webSessions: true } }` → дерево; глибше 3 рівнів — помилка, щоб не витягти всю БД. */
export function normalizeRelations(spec: RelationsOf<any> | undefined, depth = 1): RelationTree {
  if (!spec) return {};
  if (depth > MAX_DEPTH) throw new Error(`relations deeper than ${MAX_DEPTH} levels`);
  if (Array.isArray(spec)) return Object.fromEntries(spec.map((key) => [key, {}]));
  const tree: RelationTree = {};
  for (const [key, value] of Object.entries(spec as Record<string, unknown>)) {
    if (!value) continue;
    tree[key] = value === true ? {} : normalizeRelations(value as RelationsOf<any>, depth + 1);
  }
  return tree;
}

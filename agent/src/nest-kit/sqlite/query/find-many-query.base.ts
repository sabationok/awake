// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { HasPaginationQuery } from './pagination.query';

/** База query-класів `findMany`: збирає трейти списку. Без `pagination` — усі рядки. */
export class FindManyQueryBase extends HasPaginationQuery {}

/** Ключі трейтів, які база знімає з query до `_applyWhere`. */
export const FIND_MANY_TRAIT_KEYS = ['pagination'] as const;

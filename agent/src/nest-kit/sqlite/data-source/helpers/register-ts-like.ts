// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import type { DatabaseSync } from 'node:sqlite';
import { matchLikePattern } from './match-like-pattern';

/** Довший шаблон — помилка запиту: пошук по вводу з HTTP не має тягнути O(шаблон × значення) без меж. */
export const TS_LIKE_MAX_PATTERN = 500;

function toChars(text: string, caseInsensitive: boolean): string[] {
  return Array.from(caseInsensitive ? text.toLowerCase() : text);
}

/**
 * `ts_like(pattern, value, ci)` для `Like` / `ILike`. Вбудований LIKE у SQLite для ASCII завжди без регістру,
 * а `lower()` / NOCASE не знають кирилиці, тож шаблон перевіряє JS (`toLowerCase` знає Unicode) лінійним
 * matcher-ом, не RegExp: шаблон приходить з даних, а RegExp з багатьма `%` дає катастрофічний backtracking.
 */
export function registerTsLike(db: DatabaseSync) {
  db.function('ts_like', { deterministic: true }, (pattern, value, caseInsensitive) => {
    if (value === null || pattern === null) return null;
    const ci = caseInsensitive === 1;
    const chars = toChars(String(pattern), ci).filter((char, index, all) => char !== '%' || all[index - 1] !== '%');
    if (chars.length > TS_LIKE_MAX_PATTERN) throw new Error(`ts_like: pattern longer than ${TS_LIKE_MAX_PATTERN} characters`);
    return matchLikePattern(chars, toChars(String(value), ci)) ? 1 : 0;
  });
}

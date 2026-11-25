// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/**
 * LIKE-шаблон (`%` — будь-скільки символів, `_` — один) по кодових точках, без RegExp.
 * Жадібний алгоритм з одним поверненням до останнього `%`: O(шаблон × значення) у найгіршому разі,
 * без експоненційного backtracking (ReDoS) на шаблонах на кшталт `%a%a%a…%b`.
 */
export function matchLikePattern(pattern: readonly string[], value: readonly string[]): boolean {
  let p = 0;
  let v = 0;
  let star = -1;
  let mark = 0;
  while (v < value.length) {
    if (p < pattern.length && pattern[p] === '%') {
      star = p++;
      mark = v;
    } else if (p < pattern.length && (pattern[p] === '_' || pattern[p] === value[v])) {
      p++;
      v++;
    } else if (star !== -1) {
      p = star + 1;
      v = ++mark;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '%') p++;
  return p === pattern.length;
}

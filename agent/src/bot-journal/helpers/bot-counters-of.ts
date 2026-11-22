import type { StatSeriesCellRow } from '../../stats';

/**
 * Рядки bot.calls / bot.errors → плаский вигляд, який читають сторінки: `total`, `src.<джерело>`, `proxy.<id>`,
 * `type.<тип>`, `ns.<модуль>`, `error`.
 */
export function botCountersOf(calls: StatSeriesCellRow[], errors: StatSeriesCellRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  const add = (key: string, count: number) => (out[key] = (out[key] ?? 0) + count);
  for (const row of calls) {
    add('total', row.count);
    if (row.subjectId) add(`src.${row.subjectId}`, row.count);
    if (row.seriesKey) add(`proxy.${row.seriesKey}`, row.count);
    add(`type.${row.status}`, row.count);
    add(`ns.${row.value}`, row.count);
  }
  for (const row of errors) add('error', row.count);
  return out;
}

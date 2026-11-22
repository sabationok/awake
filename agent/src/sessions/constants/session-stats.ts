/** Сесії: value — джерело старту (`mac` | `telegram` | `web`…), status `count`. Рахується в годину старту. */
export const AWAKE_SESSIONS_STAT_NS = 'awake.sessions';
/** Час сесій: value — джерело, status `seconds`. Розкладено по годинах, у які сесія справді тривала. */
export const AWAKE_TIME_STAT_NS = 'awake.time';
/** Що читають сторінки: години (з них рушій будує локальні дні), тижні, місяці. */
export const SESSION_STAT_GRANULARITIES = ['hour', 'day', 'week', 'month'] as const;

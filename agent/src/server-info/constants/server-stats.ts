/** Запити до API: value — шлях (`loopback` | `lan` | `tailnet`), status — клас відповіді (`2xx`, `4xx`, `5xx`…). */
export const SERVER_REQUESTS_STAT_NS = 'server.requests';
/** Старти процесу агента: value `start`, status `count`. */
export const SERVER_STARTS_STAT_NS = 'server.starts';
/** Заміри процесу раз на 10 с (`recordGauge`): CPU у % одного ядра, value `cpu`. */
export const SERVER_CPU_STAT_NS = 'server.cpu';
/** Пам'ять процесу в байтах: value `rss` і `heap`. */
export const SERVER_MEMORY_STAT_NS = 'server.memory';
/** Навантаження Mac (load average за 1 хв): value `load`. */
export const SERVER_LOAD_STAT_NS = 'server.load';

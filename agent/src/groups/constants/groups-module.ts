/** Id модуля «Групи»: namespace бота, префікс налаштувань, ключ у /status, джерело його сповіщень. */
export const GROUPS_MODULE = 'groups';

/** Сторінки модуля: керування групою публікації (вона ж головна), список груп за станом, топіки джерел, статистика. */
export const GROUPS_PAGE = 'groups';
export const GROUPS_LIST_PAGE = 'groups-list';
export const GROUPS_TOPICS_PAGE = 'groups-topics';
export const GROUPS_STATS_PAGE = 'groups-stats';

/** Пауза між створенням топіків на прив'язці: провайдери лімітують запити в одну групу. */
export const GROUPS_TOPIC_CREATE_PAUSE_MS = 400;

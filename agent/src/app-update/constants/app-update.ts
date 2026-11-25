/** Де агент пам'ятає останню збірку, про яку сповістив: модуль і ключ у таблиці налаштувань. */
export const APP_UPDATE_MODULE = 'app';
export const APP_UPDATE_SEEN_KEY = 'update.seen';
/** Назва файла паспорта збірки поруч з `agent.cjs`; `MACONTROL_BUILD_INFO` задає інший шлях (перевірки). */
export const BUILD_INFO_FILE = 'build-info.json';
/** Telegram приймає до 4096 символів: список змін обрізаємо із запасом на заголовок і поля. */
export const UPDATE_BODY_LIMIT = 3000;

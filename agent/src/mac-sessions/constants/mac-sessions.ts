/** Ключі збережених сесій у таблиці settings: сесія переживає перезапуск сервера. */
export const MAC_SESSIONS_STORE = 'mac-sessions';
export const AWAKE_SESSION_KEY = 'awake';
export const SLEEPER_SESSION_KEY = 'sleeper';
/** Знімок дозволів від аппки: діє й тоді, коли аппка закрита. */
export const PERMISSIONS_KEY = 'permissions';

/** Як часто перевіряється кінець сесії Awake і час Sleeper. */
export const SESSION_TICK_MS = 1_000;
/** Пауза між кінцем Sleeper і сном: сповіщення встигає піти в Telegram. */
export const SLEEP_DELAY_MS = 1_500;

export const AWAKE_DEFAULT_DURATION = '2h';
export const BATTERY_STOP_DEFAULT = 10;
export const BATTERY_WARN_DEFAULT = 25;

/** Причини завершення: потрапляють в історію і Telegram. */
export const STOP_REASON = {
  manual: 'зупинено вручну',
  timer: 'таймер завершився',
  restart: 'перезапуск',
  sleeper: 'Sleeper',
  awake: 'сесія Awake',
  cancelled: 'скасовано',
  asleep: 'Mac заснув',
  interrupted: 'перервано',
} as const;

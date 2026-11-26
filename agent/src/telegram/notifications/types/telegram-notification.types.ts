import type { SettingDefinition, UiTone } from '@awake/contracts';

/** Одна подія джерела: перемикач `events.<source>.<type>` у Telegram → Сповіщення. */
export interface TelegramNotificationEvent {
  type: string;
  label: string;
  icon: { symbol: string; tone: UiTone };
  /** Без значення — увімкнено. */
  default?: boolean;
}

/**
 * Джерело сповіщень у Telegram: модуль реєструє себе сам і далі лише кличе `notify`.
 * `viaMac` — події шле скрипт Mac-аппки, а не агент: перемикачі йдуть у його telegram.env.
 * `settings` — додаткові налаштування джерела (напр. «Попереджати за»), що їх показує вкладка джерела на Сповіщеннях.
 * Ключі повного вигляду (`events.<source>.<name>`), без `page`: сторінку службі Сповіщень задає сама.
 * `privateOnly` — події лише власнику особисто (про саму групу сповіщень): у групу не йдуть і свого топіка не мають.
 */
export interface TelegramNotificationSource {
  id: string;
  label: string;
  viaMac?: boolean;
  privateOnly?: boolean;
  settings?: SettingDefinition[];
  events: TelegramNotificationEvent[];
  /**
   * Чия вкладка на Сповіщеннях показує налаштування: ключ налаштування (`events.<source>.<…>`) → id іншого джерела.
   * Так попередження про кінець Awake стоїть у вкладці Awake, а Sleeper — у Sleeper; джерело без власних рядків
   * вкладки не має.
   */
  tabOf?: Record<string, string>;
}

/** Що агент хоче сказати в Telegram; формат повідомлення і перевірку перемикача робить Telegram. */
export interface TelegramNotification {
  source: string;
  type: string;
  title: string;
  /** Звичайний текст під заголовком (напр. список змін збірки). */
  body?: string;
  fields: Record<string, string | number>;
}

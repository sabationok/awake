import type { UiTone } from '@awake/contracts';

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
 */
export interface TelegramNotificationSource {
  id: string;
  label: string;
  viaMac?: boolean;
  events: TelegramNotificationEvent[];
}

/** Що агент хоче сказати в Telegram; формат повідомлення і перевірку перемикача робить Telegram. */
export interface TelegramNotification {
  source: string;
  type: string;
  title: string;
  fields: Record<string, string | number>;
}

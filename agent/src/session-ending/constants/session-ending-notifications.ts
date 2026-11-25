import type { SettingDefinition } from '@awake/contracts';
import { TELEGRAM_NOTIFICATIONS_PAGE, type TelegramNotificationSource } from '../../telegram/notifications';
import { SESSION_ENDING_LEAD_DEFAULT, SESSION_ENDING_LEAD_KEY, SESSION_ENDING_LEAD_OPTIONS } from './session-ending';

/** Налаштування «Попереджати за» показує вкладка джерела; page задає сервіс Сповіщень. */
const LEAD_SETTING: SettingDefinition = {
  type: 'select',
  key: SESSION_ENDING_LEAD_KEY,
  label: 'Попереджати за',
  default: SESSION_ENDING_LEAD_DEFAULT,
  page: TELEGRAM_NOTIFICATIONS_PAGE,
  options: SESSION_ENDING_LEAD_OPTIONS,
};

/**
 * Попередження про кінець сесії Awake і таймера сну. Шле їх агент (не скрипт Mac), тому джерело не viaMac:
 * його перемикачі лишаються в Telegram, а не в telegram.env.
 */
export const SESSION_ENDING_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'ending',
  label: 'Попередження',
  settings: [LEAD_SETTING],
  events: [
    { type: 'awake', label: 'Сесія Awake скоро скінчиться', icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' } },
    { type: 'sleep', label: 'Sleeper скоро спрацює', icon: { symbol: 'moon.zzz.fill', tone: 'accent' } },
  ],
};

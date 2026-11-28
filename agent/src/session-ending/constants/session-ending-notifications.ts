import type { SettingDefinition } from '@macontrol/contracts';
import { TELEGRAM_NOTIFICATIONS_PAGE, telegramNotificationSettingKey, type TelegramNotificationSource } from '../../telegram/notifications';
import { SESSION_ENDING_LEAD_DEFAULT, SESSION_ENDING_LEAD_KEYS, SESSION_ENDING_LEAD_OPTIONS } from './session-ending';

/** «Попереджати за» одного виду сесії; page задає сервіс Сповіщень. */
const leadSetting = (key: string): SettingDefinition => ({
  type: 'select',
  key,
  label: 'Попереджати за',
  default: SESSION_ENDING_LEAD_DEFAULT,
  page: TELEGRAM_NOTIFICATIONS_PAGE,
  options: SESSION_ENDING_LEAD_OPTIONS,
});

/**
 * Попередження про кінець сесії Awake і таймера сну. Шле їх агент (не скрипт Mac), тому джерело не viaMac:
 * його перемикачі лишаються в Telegram, а не в telegram.env. Своєї вкладки немає: перемикач і «Попереджати за»
 * кожного виду стоять у вкладці свого модуля, і час попередження в кожного свій.
 */
export const SESSION_ENDING_NOTIFICATIONS: TelegramNotificationSource = {
  id: 'ending',
  label: 'Попередження',
  settings: [leadSetting(SESSION_ENDING_LEAD_KEYS.awake), leadSetting(SESSION_ENDING_LEAD_KEYS.sleep)],
  events: [
    { type: 'awake', label: 'Сесія Awake скоро скінчиться', icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' } },
    { type: 'sleep', label: 'Sleeper скоро спрацює', icon: { symbol: 'moon.zzz.fill', tone: 'accent' } },
  ],
  tabOf: {
    [telegramNotificationSettingKey('ending', 'awake')]: 'awake',
    [SESSION_ENDING_LEAD_KEYS.awake]: 'awake',
    [telegramNotificationSettingKey('ending', 'sleep')]: 'sleep',
    [SESSION_ENDING_LEAD_KEYS.sleep]: 'sleep',
  },
};

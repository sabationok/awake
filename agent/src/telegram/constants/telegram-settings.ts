import type { SettingDefinition } from '@awake/contracts';

/** Власні налаштування Telegram. Перемикачі команд — з реєстру `@Bot`, сповіщень — з TelegramNotificationsService. */
export const TELEGRAM_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'bot',
    label: 'Бот у MaControl',
    hint: 'Команди й кнопки в Telegram',
    page: 'telegram',
    default: true,
  },
];

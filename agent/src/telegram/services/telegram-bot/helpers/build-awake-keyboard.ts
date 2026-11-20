import type { InlineKeyboardMarkup } from 'telegraf/types';
import { AWAKE_QUICK_DURATIONS } from '../constants/awake-durations';
import { BOT_TEXTS } from '../constants/bot-texts';

/** Інлайн-клавіатура /awake: швидкі тривалості, потім стан і стоп. */
export function buildAwakeKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      AWAKE_QUICK_DURATIONS.map(({ duration, label }) => ({ text: label, callback_data: `start:${duration}` })),
      [
        { text: BOT_TEXTS.statusButton, callback_data: 'status' },
        { text: BOT_TEXTS.stopButton, callback_data: 'stop' },
      ],
    ],
  };
}

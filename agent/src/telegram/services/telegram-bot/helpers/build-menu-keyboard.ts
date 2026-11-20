import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { BotMenu } from '../../../../modules/types/mac-module';
import { BOT_TEXTS } from '../constants/bot-texts';
import { encodeAction, encodeMenu } from './callback-data';

/** Кнопки меню модуля плюс «Оновити», яке є в кожному меню. */
export function buildMenuKeyboard(moduleId: string, menu: BotMenu): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...menu.buttons.map((row) =>
        row.map((b) => ({ text: b.label, callback_data: encodeAction(moduleId, b.action, b.params) })),
      ),
      [{ text: BOT_TEXTS.refreshButton, callback_data: encodeMenu(moduleId) }],
    ],
  };
}

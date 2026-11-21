import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'telegraf/types';
import type { BotButton, BotMenu } from '../../../../bot';
import { BOT_TEXTS } from '../constants/bot-texts';
import { encodeAction, encodeNav } from './callback-data';

/** Кнопки екрана модуля, під ними «← Назад» (крім головного екрана) і «Оновити» цього екрана. */
export function buildMenuKeyboard(moduleId: string, screen: string, menu: BotMenu): InlineKeyboardMarkup {
  const footer: InlineKeyboardButton[] = [];
  if (menu.back) footer.push({ text: BOT_TEXTS.backButton, callback_data: encodeNav(menu.back.namespace ?? moduleId, menu.back.screen) });
  footer.push({ text: BOT_TEXTS.refreshButton, callback_data: encodeNav(moduleId, screen) });
  return {
    inline_keyboard: [...menu.buttons.map((row) => row.map((button) => toInline(moduleId, screen, button))), footer],
  };
}

function toInline(moduleId: string, screen: string, button: BotButton): InlineKeyboardButton {
  if (button.action) {
    // Дія з переходом в інший модуль не буває: після дії малюємо екран свого модуля.
    const next = button.go && !button.go.namespace ? button.go.screen : screen;
    return { text: button.label, callback_data: encodeAction(moduleId, next, button.action, button.params) };
  }
  const go = button.go ?? { screen: '' };
  return { text: button.label, callback_data: encodeNav(go.namespace ?? moduleId, go.screen) };
}

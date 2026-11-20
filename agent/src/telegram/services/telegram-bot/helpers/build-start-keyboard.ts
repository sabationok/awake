import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { MacModule } from '../../../../modules/types/mac-module';
import { encodeNav } from './callback-data';

/** /start: по кнопці на кожен модуль бота, по дві в ряд. Так відкриваються і модулі без своєї команди. */
export function buildStartKeyboard(modules: MacModule[]): InlineKeyboardMarkup {
  const buttons = modules
    .filter((module) => module.bot)
    .map((module) => ({ text: module.bot!.description, callback_data: encodeNav(module.id, '') }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return { inline_keyboard: rows };
}

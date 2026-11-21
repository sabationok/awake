import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { BotNamespace } from '../../../../bot';
import { encodeNav } from './callback-data';

/** /start: по кнопці на кожен модуль бота, по дві в ряд. Так відкриваються і модулі без своєї команди. */
export function buildStartKeyboard(namespaces: BotNamespace[]): InlineKeyboardMarkup {
  const buttons = namespaces.map((ns) => ({
    text: ns.description ?? ns.namespace,
    callback_data: encodeNav(ns.namespace, ''),
  }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return { inline_keyboard: rows };
}

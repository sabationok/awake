import type { BotEventType } from '../../../bot-journal';
import type { ModuleSource } from '../../types/module-source';

/** Джерело виклику бота людською мовою. */
export const BOT_SOURCE_LABEL: Record<ModuleSource, string> = { mac: 'Mac', web: 'Веб (LAN)', relay: 'Webhooxy', telegram: 'Telegram' };

export const BOT_EVENT_TYPE_LABEL: Record<BotEventType, string> = { action: 'дія', screen: 'екран', setting: 'налаштування' };

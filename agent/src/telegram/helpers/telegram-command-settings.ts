import type { SettingDefinition } from '@awake/contracts';
import type { BotNamespace } from '../../bot';
import { telegramCommandSettingKey } from './telegram-command-setting-key';

/** Перемикач на кожен namespace бота: вимкнений зникає з меню команд Telegram, /start і не приймає ні команд, ні кнопок. */
export function telegramCommandSettings(namespaces: BotNamespace[]): SettingDefinition[] {
  return namespaces.map((ns) => ({
    type: 'switch',
    key: telegramCommandSettingKey(ns.namespace),
    label: ns.command ? `/${ns.command}` : ns.namespace,
    hint: ns.description ?? (ns.command ? undefined : 'Лише кнопками з /start'),
    page: 'telegram-commands',
    default: true,
  }));
}

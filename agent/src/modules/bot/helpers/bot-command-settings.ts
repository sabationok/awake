import type { SettingDefinition } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import { botCommandSettingKey } from './bot-command-setting-key';

/** Перемикач на кожен namespace бота: вимкнений зникає з меню команд, /start і не приймає ні команд, ні кнопок. */
export function botCommandSettings(namespaces: BotNamespace[]): SettingDefinition[] {
  return namespaces.map((ns) => ({
    type: 'switch',
    key: botCommandSettingKey(ns.namespace),
    label: ns.command ? `/${ns.command}` : ns.namespace,
    hint: ns.description ?? (ns.command ? undefined : 'Лише кнопками з /start'),
    page: 'bot-commands',
    default: true,
  }));
}

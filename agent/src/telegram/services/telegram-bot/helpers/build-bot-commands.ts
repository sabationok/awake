import type { BotCommand as TelegramCommand } from 'telegraf/types';
import type { BotNamespace } from '../../../../bot';

/** Меню команд Telegram: по одній команді на namespace. Namespace без команди тут не з'являється. */
export function buildBotCommands(namespaces: BotNamespace[]): TelegramCommand[] {
  return namespaces.flatMap(({ command, description }) => (command ? [{ command, description: description ?? command }] : []));
}

import type { BotCommand as TelegramCommand } from 'telegraf/types';
import type { MacModule } from '../../../../modules/types/mac-module';

/** Меню команд Telegram: по одній команді на модуль. Модуль без команди тут не з'являється. */
export function buildBotCommands(modules: MacModule[]): TelegramCommand[] {
  return modules.flatMap(({ bot }) => (bot?.command ? [{ command: bot.command, description: bot.description }] : []));
}

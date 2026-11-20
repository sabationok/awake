import type { BotCommand as TelegramCommand } from 'telegraf/types';
import type { MacModule } from '../../../../modules/types/mac-module';

/** Меню команд Telegram: вхідна команда модуля, за нею його команди другого рівня (`/awake_start`). */
export function buildBotCommands(modules: MacModule[]): TelegramCommand[] {
  return modules.flatMap(({ bot }) =>
    bot
      ? [
          { command: bot.command, description: bot.description },
          ...(bot.commands ?? []).map((c) => ({ command: `${bot.command}_${c.name}`, description: c.description })),
        ]
      : [],
  );
}

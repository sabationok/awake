import type { MacModule } from '../../../../modules/types/mac-module';
import { BOT_TEXTS } from '../constants/bot-texts';
import { buildBotCommands } from './build-bot-commands';

/** Відповідь на /start і /help: команди всіх модулів. */
export function buildHelpText(modules: MacModule[]): string {
  const lines = buildBotCommands(modules).map((c) => `/${c.command} — ${c.description}`);
  return [BOT_TEXTS.help, ...lines].join('\n');
}

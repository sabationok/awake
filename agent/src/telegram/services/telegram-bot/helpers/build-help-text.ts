import type { BotNamespace } from '../../../../bot';
import { BOT_TEXTS } from '../constants/bot-texts';
import { buildBotCommands } from './build-bot-commands';

/** Відповідь на /start і /help: команди всіх модулів. */
export function buildHelpText(namespaces: BotNamespace[]): string {
  const lines = buildBotCommands(namespaces).map((c) => `/${c.command} — ${c.description}`);
  return [BOT_TEXTS.help, ...lines].join('\n');
}

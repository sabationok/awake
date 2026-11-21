import type { BOT_CONTEXT_TYPE } from '../constants/bot-metadata';

export type BotContextType = typeof BOT_CONTEXT_TYPE;

export type BotParamValue = string | number | boolean;

/**
 * Єдиний аргумент, з яким роутер викликає хендлер. Param-декоратори (`@BotParams`, `@BotCtx`, `@BotSource`)
 * і guards читають його з ExecutionContext.
 */
export interface BotArgs<TContext = unknown> {
  bot: string;
  namespace: string;
  /** Ім'я дії або шлях екрана ('' — головний). */
  name: string;
  params: Record<string, BotParamValue>;
  /** Звідки прийшов виклик: 'telegram', 'web', 'mac'… Транспорт вирішує сам. */
  source: string;
  /** Контекст застосунку для namespace (у MaControl — ModuleContext модуля). */
  context: TContext;
}

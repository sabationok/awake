import type { BOT_CONTEXT_TYPE } from '../constants/bot-metadata';

export type BotContextType = typeof BOT_CONTEXT_TYPE;

export type BotParamValue = string | number | boolean;

/** Яким шляхом прийшов виклик усередині свого джерела. Порожньо — напряму (приватний чат, LAN, Mac). */
export interface BotVia {
  /** Id проксі, через який прийшов запит Web UI. */
  proxy?: string;
  /** Id групового чату, з якого натиснули кнопку. */
  group?: string;
}

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
  /** Шлях усередині джерела, якщо він не прямий: проксі для web, груповий чат для telegram. */
  via?: BotVia;
  /** Контекст застосунку для namespace (у MaControl — ModuleContext модуля). */
  context: TContext;
}

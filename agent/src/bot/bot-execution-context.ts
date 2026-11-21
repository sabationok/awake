import type { ExecutionContext } from '@nestjs/common';
import type { BotArgs } from './types/bot-args.types';

/** Доступ до аргументів бота з ExecutionContext, як `GqlExecutionContext`. Для guards і param-декораторів. */
export class BotExecutionContext {
  private constructor(private readonly _context: ExecutionContext) {}

  static create(context: ExecutionContext): BotExecutionContext {
    return new BotExecutionContext(context);
  }

  getArgs<TContext = unknown>(): BotArgs<TContext> {
    return this._context.getArgByIndex<BotArgs<TContext>>(0);
  }
}

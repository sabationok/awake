import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { BotExecutionContext } from '../bot-execution-context';

const args = (ec: ExecutionContext) => BotExecutionContext.create(ec).getArgs();

/** Параметри кнопки (`{ minutes: '45' }`); з ключем — одне значення: `@BotParams('minutes')`. */
export const BotParams = createParamDecorator((key: string | undefined, ec: ExecutionContext) =>
  key ? args(ec).params[key] : args(ec).params,
);

/** Контекст застосунку для namespace (у MaControl — ModuleContext). */
export const BotCtx = createParamDecorator((_: unknown, ec: ExecutionContext) => args(ec).context);

/** Звідки прийшов виклик: 'telegram' | 'web' | 'mac'. */
export const BotSource = createParamDecorator((_: unknown, ec: ExecutionContext) => args(ec).source);

/** Шлях усередині джерела (`{ proxy }`, `{ group }`); прямий виклик — порожній об'єкт. */
export const BotVia = createParamDecorator((_: unknown, ec: ExecutionContext) => args(ec).via ?? {});

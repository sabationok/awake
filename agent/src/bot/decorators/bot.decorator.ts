import { applyDecorators, Injectable, SetMetadata } from '@nestjs/common';
import { BOT_METADATA } from '../constants/bot-metadata';
import type { BotNamespace, BotOptions } from '../types/bot-options.types';

/**
 * Клас-обробник бота, як `@WebSocketGateway`: `@Bot('MaControl', { namespace: 'sleep' })`.
 * Методи з `@BotAction` / `@BotScreen` роутер знаходить сам; клас лише реєструється провайдером.
 */
export function Bot(name: string, options: BotOptions): ClassDecorator {
  const meta: BotNamespace = { bot: name, ...options };
  return applyDecorators(Injectable(), SetMetadata(BOT_METADATA, meta));
}

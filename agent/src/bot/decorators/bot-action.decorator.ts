import { SetMetadata } from '@nestjs/common';
import { BOT_ACTION_METADATA } from '../constants/bot-metadata';

/** Дія namespace, як `@SubscribeMessage`. Її викликає і кнопка Telegram, і кнопка SDUI. */
export const BotAction = (name: string): MethodDecorator => SetMetadata(BOT_ACTION_METADATA, name);

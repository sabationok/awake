import { Global, Module } from '@nestjs/common';
import { TelegramStateService } from './telegram-state.service';

/** Глобальний: стан polling-у пише бот, читає модуль Telegram у реєстрі модулів. */
@Global()
@Module({ providers: [TelegramStateService], exports: [TelegramStateService] })
export class TelegramStateModule {}

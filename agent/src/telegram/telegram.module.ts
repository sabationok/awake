import { Module } from '@nestjs/common';
import { TelegramBotListener, TelegramBotService } from './services/telegram-bot';

/** Telegram-бот MacCC. Сам перемикач у налаштуваннях живе в TelegramMacModule. */
@Module({
  providers: [TelegramBotService, TelegramBotListener],
})
export class TelegramModule {}

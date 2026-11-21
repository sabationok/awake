import { Module } from '@nestjs/common';
import { SleepTimerEventsListener, TelegramBotListener, TelegramBotService } from './services/telegram-bot';

/** Telegram-бот MaControl. Сам перемикач у налаштуваннях живе в TelegramMacModule. */
@Module({
  providers: [TelegramBotService, TelegramBotListener, SleepTimerEventsListener],
})
export class TelegramModule {}

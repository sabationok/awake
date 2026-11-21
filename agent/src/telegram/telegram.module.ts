import { Module } from '@nestjs/common';
import { TelegramStateListener } from './listeners/telegram-state.listener';
import { RelayEventsListener, SleepTimerEventsListener, TelegramBotListener, TelegramBotService } from './services/telegram-bot';

/** Telegram-бот MaControl. Сам перемикач у налаштуваннях живе в TelegramMacModule. */
@Module({
  providers: [TelegramBotService, TelegramBotListener, SleepTimerEventsListener, RelayEventsListener, TelegramStateListener],
})
export class TelegramModule {}

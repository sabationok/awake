import { Module } from '@nestjs/common';
import { TelegramStateListener } from './listeners/telegram-state.listener';
import { TelegramBotListener, TelegramBotService, TelegramNotificationsListener } from './services/telegram-bot';

/** Telegram-бот MaControl: транспорт у нашого бота і доставка сповіщень з реєстру. Перемикачі — TelegramMacModule. */
@Module({
  providers: [TelegramBotService, TelegramBotListener, TelegramNotificationsListener, TelegramStateListener],
})
export class TelegramModule {}

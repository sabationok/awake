import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups';
import { TelegramGroupsProviderModule } from './groups';
import { TelegramGroupDeliveryService } from './groups/telegram-group-delivery.service';
import { TelegramGroupsListener } from './groups/telegram-groups.listener';
import { TelegramStateListener } from './listeners/telegram-state.listener';
import { TelegramBotListener, TelegramBotService, TelegramNotificationsListener } from './services/telegram-bot';
import { TelegramBot } from './telegram.bot';

/** Telegram-бот MaControl: транспорт у нашого бота і доставка сповіщень з реєстру. Перемикачі — TelegramMacModule. */
@Module({
  // Ядро груп (прив'язка, топіки, адресати) і конектор груп із клієнтом Bot API; жоден із них не імпортує цей модуль.
  imports: [GroupsModule, TelegramGroupsProviderModule],
  providers: [
    TelegramBotService,
    TelegramBotListener,
    TelegramNotificationsListener,
    TelegramStateListener,
    TelegramBot,
    TelegramGroupsListener,
    TelegramGroupDeliveryService,
  ],
})
export class TelegramModule {}

import { Module } from '@nestjs/common';
import { TelegramClientService } from './telegram-client.service';
import { TelegramGroupProvider } from './telegram-group.provider';

/**
 * Конектор груп Telegram без жодного імпорту: його бере ядро груп (у `GROUP_PROVIDERS`) і TelegramModule (щоб
 * покласти клієнт запущеного бота). Один екземпляр на застосунок, бо модуль один.
 */
@Module({
  providers: [TelegramClientService, TelegramGroupProvider],
  exports: [TelegramClientService, TelegramGroupProvider],
})
export class TelegramGroupsProviderModule {}

import { Global, Module } from '@nestjs/common';
import { BotJournalService } from './bot-journal.service';
import { BotMessagesRepository } from './repositories/bot-messages.repository';
import { BotMetricsRepository } from './repositories/bot-metrics.repository';

/** Глобальний: пише Telegram, читає модуль Bot у реєстрі модулів. Залежить лише від БД, тож циклу немає. */
@Global()
@Module({
  providers: [BotJournalService, BotMessagesRepository, BotMetricsRepository],
  exports: [BotJournalService],
})
export class BotJournalModule {}

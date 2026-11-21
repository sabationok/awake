import { Global, Module } from '@nestjs/common';
import { BotJournalService } from './bot-journal.service';
import { BotEventsRepository } from './repositories/bot-events.repository';
import { BotMetricsRepository } from './repositories/bot-metrics.repository';

/** Глобальний: пише ModulesService (і Telegram — свої лічильники), читає модуль Bot. Залежить лише від БД, тож циклу немає. */
@Global()
@Module({
  providers: [BotJournalService, BotEventsRepository, BotMetricsRepository],
  exports: [BotJournalService],
})
export class BotJournalModule {}

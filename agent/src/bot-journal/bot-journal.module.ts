import { Global, Module } from '@nestjs/common';
import { BotCallsChartsService } from './bot-calls-charts.service';
import { BotJournalService } from './bot-journal.service';
import { BotEventsRepository } from './repositories/bot-events.repository';

/** Глобальний: пише ModulesService, читає модуль Bot. Залежить лише від БД і stats, тож циклу немає. */
@Global()
@Module({
  providers: [BotJournalService, BotCallsChartsService, BotEventsRepository],
  exports: [BotJournalService, BotCallsChartsService],
})
export class BotJournalModule {}

import { Global, Module } from '@nestjs/common';
import { BotJournalService } from './bot-journal.service';
import { BotEventsRepository } from './repositories/bot-events.repository';

/** Глобальний: пише ModulesService, читає модуль Bot. Залежить лише від БД і stats, тож циклу немає. */
@Global()
@Module({
  providers: [BotJournalService, BotEventsRepository],
  exports: [BotJournalService],
})
export class BotJournalModule {}

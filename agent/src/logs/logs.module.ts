import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsListener } from './logs.listener';
import { LogsService } from './logs.service';
import { LogsRepository } from './repositories/logs.repository';

@Module({
  controllers: [LogsController],
  providers: [LogsRepository, LogsService, LogsListener],
  exports: [LogsService],
})
export class LogsModule {}

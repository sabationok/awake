import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsListener } from './sessions.listener';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './repositories/sessions.repository';

@Module({
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionsService, SessionsListener],
  exports: [SessionsService],
})
export class SessionsModule {}

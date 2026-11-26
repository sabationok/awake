import { Module } from '@nestjs/common';
import { WebSessionsRepository } from './repositories/web-sessions.repository';
import { DashboardPasswordService } from './services/dashboard-password.service';
import { WebSessionsService } from './services/web-sessions.service';
import { WebAuthController } from './web-auth.controller';

/** Вебсесії Web UI (SQLite) і пароль. Не `sessions`: `agent/src/sessions` — сесії Mac для статистики. */
@Module({
  controllers: [WebAuthController],
  providers: [WebSessionsRepository, WebSessionsService, DashboardPasswordService],
  exports: [WebSessionsService, DashboardPasswordService],
})
export class WebAuthModule {}

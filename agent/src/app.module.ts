import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AgentTokenGuard } from './auth/agent-token.guard';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { LogsModule } from './logs/logs.module';
import { MacBridgeModule } from './mac-bridge/mac-bridge.module';
import { ModulesModule } from './modules/modules.module';
import { PresenceModule } from './presence/presence.module';
import { RelayModule } from './relay/relay.module';
import { RelayStateModule } from './relay/state/relay-state.module';
import { BotJournalModule } from './bot-journal';
import { SessionsModule } from './sessions/sessions.module';
import { TelegramModule } from './telegram/telegram.module';
import { TlsModule } from './tls/tls.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MacBridgeModule,
    DevicesModule,
    SessionsModule,
    LogsModule,
    TlsModule,
    PresenceModule,
    RelayStateModule,
    BotJournalModule,
    ModulesModule,
    RelayModule,
    TelegramModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AgentTokenGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

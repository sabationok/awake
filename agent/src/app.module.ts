import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DevicesModule } from './devices/devices.module';
import { EnvifyModule } from './envify';
import { StatsModule } from './stats';
import { SecretsModule } from './secrets';
import { WebhooksModule } from './webhooks';
import { TailscaleModule } from './tailscale';
import { ServerInfoModule } from './server-info';
import { TrustedNetworksModule } from './trusted-networks';
import { ProximityModule } from './proximity';
import { LogsModule } from './logs/logs.module';
import { MacBridgeModule } from './mac-bridge/mac-bridge.module';
import { MacSessionsModule } from './mac-sessions/mac-sessions.module';
import { ModulesModule } from './modules/modules.module';
import { PresenceModule } from './presence/presence.module';
import { RelayModule } from './relay/relay.module';
import { RelayStateModule } from './relay/state/relay-state.module';
import { TelegramNotificationsModule } from './telegram/notifications';
import { TelegramStateModule } from './telegram/state/telegram-state.module';
import { TransportsModule } from './transports';
import { BotJournalModule } from './bot-journal';
import { SessionsModule } from './sessions/sessions.module';
import { TelegramModule } from './telegram/telegram.module';
import { TlsModule } from './tls/tls.module';
import { AppUpdateModule } from './app-update/app-update.module';
import { SessionEndingModule } from './session-ending/session-ending.module';
import { GroupsModule } from './groups';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MacBridgeModule,
    EnvifyModule,
    SecretsModule,
    StatsModule,
    WebhooksModule,
    TailscaleModule,
    ServerInfoModule,
    TrustedNetworksModule,
    ProximityModule,
    DevicesModule,
    AuthModule,
    SessionsModule,
    LogsModule,
    TlsModule,
    PresenceModule,
    RelayStateModule,
    TelegramStateModule,
    TelegramNotificationsModule,
    TransportsModule,
    BotJournalModule,
    ModulesModule,
    RelayModule,
    TelegramModule,
    // Після ModulesModule: порядок реєстрації модулів — порядок команд бота, /groups іде після команд модулів Mac.
    GroupsModule,
    SessionEndingModule,
    MacSessionsModule,
    AppUpdateModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}

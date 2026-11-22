import { Global, Module } from '@nestjs/common';
import { BotModule } from '../bot';
import { LogsModule } from '../logs/logs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SleepTimersModule } from '../sleep-timers/sleep-timers.module';
import { SettingsModule } from '../settings/settings.module';
import { AwakeBot } from './awake/awake.bot';
import { AwakeMacModule } from './awake/awake.mac-module';
import { AwakeSessionListener } from './awake/listeners/awake-session.listener';
import { MacBot } from './mac/mac.bot';
import { MacStateMacModule } from './mac/mac.mac-module';
import { MediaBot } from './media/media.bot';
import { MediaMacModule } from './media/media.mac-module';
import { SleepBot } from './sleep/sleep.bot';
import { SleepMacModule } from './sleep/sleep.mac-module';
import { TelegramMacModule } from '../telegram/telegram.mac-module';
import { RelayBot } from '../relay/relay.bot';
import { RelayMacModule } from '../relay/relay.mac-module';
import { ProximityMacModule } from '../proximity/proximity.mac-module';
import { TailscaleMacModule } from '../tailscale/tailscale.mac-module';
import { BotMacModule } from './bot/bot.mac-module';
import { BotEventsListener } from './bot/listeners/bot-events.listener';
import { BotJournalListener } from './bot/listeners/bot-journal.listener';
import { SleepTimerEventsListener } from './sleep/listeners/sleep-timer-events.listener';
import { ModulesService } from './modules.service';
import { MacUiListener } from './mac-ui.listener';
import { UiController } from './ui.controller';
import { MAC_MODULES, type MacModule } from './types/mac-module';

@Global()
@Module({
  imports: [BotModule, SettingsModule, SessionsModule, SleepTimersModule, LogsModule],
  controllers: [UiController],
  providers: [
    ModulesService,
    MacUiListener,
    AwakeSessionListener,
    AwakeMacModule,
    SleepMacModule,
    MediaMacModule,
    MacStateMacModule,
    TelegramMacModule,
    BotMacModule,
    BotJournalListener,
    BotEventsListener,
    SleepTimerEventsListener,
    RelayMacModule,
    ProximityMacModule,
    TailscaleMacModule,
    // Дії й екрани модулів: @Bot(MACONTROL_BOT, { namespace }). Порядок — порядок команд у Telegram.
    AwakeBot,
    SleepBot,
    MediaBot,
    MacBot,
    RelayBot,
    {
      provide: MAC_MODULES,
      useFactory: (...modules: MacModule[]) => modules,
      inject: [AwakeMacModule, SleepMacModule, MediaMacModule, MacStateMacModule, TelegramMacModule, BotMacModule, RelayMacModule, TailscaleMacModule, ProximityMacModule],
    },
  ],
  exports: [ModulesService],
})
export class ModulesModule {}

import { Global, Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SleepTimersModule } from '../sleep-timers/sleep-timers.module';
import { SettingsModule } from '../settings/settings.module';
import { AwakeMacModule } from './awake/awake.mac-module';
import { AwakeSessionListener } from './awake/listeners/awake-session.listener';
import { MacStateMacModule } from './mac/mac.mac-module';
import { MediaMacModule } from './media/media.mac-module';
import { SleepMacModule } from './sleep/sleep.mac-module';
import { TelegramMacModule } from '../telegram/telegram.mac-module';
import { ModulesService } from './modules.service';
import { MacUiListener } from './mac-ui.listener';
import { UiController } from './ui.controller';
import { MAC_MODULES, type MacModule } from './types/mac-module';

@Global()
@Module({
  imports: [SettingsModule, SessionsModule, SleepTimersModule, LogsModule],
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
    {
      provide: MAC_MODULES,
      useFactory: (...modules: MacModule[]) => modules,
      inject: [AwakeMacModule, SleepMacModule, MediaMacModule, MacStateMacModule, TelegramMacModule],
    },
  ],
  exports: [ModulesService],
})
export class ModulesModule {}

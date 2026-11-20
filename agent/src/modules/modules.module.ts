import { Global, Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SettingsModule } from '../settings/settings.module';
import { AwakeMacModule } from './awake/awake.mac-module';
import { MacStateMacModule } from './mac/mac.mac-module';
import { TelegramMacModule } from '../telegram/telegram.mac-module';
import { ModulesService } from './modules.service';
import { MacUiListener } from './mac-ui.listener';
import { UiController } from './ui.controller';
import { MAC_MODULES, type MacModule } from './types/mac-module';

@Global()
@Module({
  imports: [SettingsModule, SessionsModule, LogsModule],
  controllers: [UiController],
  providers: [
    ModulesService,
    MacUiListener,
    AwakeMacModule,
    MacStateMacModule,
    TelegramMacModule,
    {
      provide: MAC_MODULES,
      useFactory: (...modules: MacModule[]) => modules,
      inject: [AwakeMacModule, MacStateMacModule, TelegramMacModule],
    },
  ],
  exports: [ModulesService],
})
export class ModulesModule {}

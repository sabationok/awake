import { Global, Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { SessionsModule } from '../sessions/sessions.module';
import { SettingsModule } from '../settings/settings.module';
import { AwakeMacModule } from './awake/awake.mac-module';
import { TelegramMacModule } from '../telegram/telegram.mac-module';
import { ModulesService } from './modules.service';
import { UiController } from './ui.controller';
import { MAC_MODULES, type MacModule } from './types/mac-module';

@Global()
@Module({
  imports: [SettingsModule, SessionsModule, LogsModule],
  controllers: [UiController],
  providers: [
    ModulesService,
    AwakeMacModule,
    TelegramMacModule,
    {
      provide: MAC_MODULES,
      useFactory: (...modules: MacModule[]) => modules,
      inject: [AwakeMacModule, TelegramMacModule],
    },
  ],
  exports: [ModulesService],
})
export class ModulesModule {}

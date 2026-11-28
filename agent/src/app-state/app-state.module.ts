import { Module } from '@nestjs/common';
import { MacPermissionsModule } from '../mac-permissions/mac-permissions.module';
import { AppStateController } from './app-state.controller';
import { MacStateListener } from './listeners/mac-state.listener';
import { SessionNotifyListener } from './listeners/session-notify.listener';
import { AppStateService } from './services/app-state.service';
import { UiNotifyService } from './services/ui-notify.service';

/**
 * AppState і тости сервера (скіл `sdui` «State, bind, show»; docs/sdui.md §5 крок 1): власник стейту, канал Mac
 * socket і живий канал локального Web UI. ModulesService і MacBridgeService — з глобальних модулів.
 */
@Module({
  imports: [MacPermissionsModule],
  controllers: [AppStateController],
  providers: [AppStateService, UiNotifyService, MacStateListener, SessionNotifyListener],
  exports: [AppStateService, UiNotifyService],
})
export class AppStateModule {}

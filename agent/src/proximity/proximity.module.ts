import { Global, Module } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { SettingsModule } from '../settings/settings.module';
import { ProximityListener, ProximityService } from './services/proximity';

@Global()
@Module({
  imports: [SettingsModule, LogsModule],
  providers: [ProximityService, ProximityListener],
  exports: [ProximityService],
})
export class ProximityModule {}

import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { AppUpdateListener } from './app-update.listener';

/** Сповіщення про нову збірку зі списком змін. */
@Module({
  imports: [SettingsModule],
  providers: [AppUpdateListener],
})
export class AppUpdateModule {}

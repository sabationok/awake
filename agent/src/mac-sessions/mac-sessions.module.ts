import { Module } from '@nestjs/common';
import { MacPermissionsModule } from '../mac-permissions/mac-permissions.module';
import { SettingsModule } from '../settings/settings.module';
import { MacSessionsService } from './mac-sessions.service';

/** Сесії Awake і Sleeper, які веде сам сервер (режим standalone). */
@Module({ imports: [SettingsModule, MacPermissionsModule], providers: [MacSessionsService] })
export class MacSessionsModule {}

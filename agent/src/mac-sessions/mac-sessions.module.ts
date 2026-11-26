import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { MacSessionsService } from './mac-sessions.service';

/** Сесії Awake і Sleeper, які веде сам сервер (режим standalone). */
@Module({ imports: [SettingsModule], providers: [MacSessionsService] })
export class MacSessionsModule {}

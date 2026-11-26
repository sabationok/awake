import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { MacPermissionsService } from './mac-permissions.service';

/** Дозволи, якими володіє сервер: системні (через помічник) і перемикачі модулів. */
@Module({ imports: [SettingsModule], providers: [MacPermissionsService], exports: [MacPermissionsService] })
export class MacPermissionsModule {}

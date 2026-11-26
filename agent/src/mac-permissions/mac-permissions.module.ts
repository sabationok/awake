import { Module } from '@nestjs/common';
import { BotModule } from '../bot';
import { SettingsModule } from '../settings/settings.module';
import { MacPermissionsService } from './mac-permissions.service';
import { PermissionsBot } from './permissions.bot';
import { PermissionsMacModule } from './permissions.mac-module';

/** Дозволи, якими володіє сервер: системні (через помічник) і перемикачі модулів, зі сторінкою «Дозволи». */
@Module({
  imports: [SettingsModule, BotModule],
  providers: [MacPermissionsService, PermissionsMacModule, PermissionsBot],
  exports: [MacPermissionsService, PermissionsMacModule],
})
export class MacPermissionsModule {}

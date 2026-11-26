import { Module } from '@nestjs/common';
import { BotModule } from '../bot';
import { DevicesModule } from '../devices/devices.module';
import { WebAuthModule } from '../web-auth/web-auth.module';
import { WebUiBot } from './web-ui.bot';
import { WebUiMacModule } from './web-ui.mac-module';

/** Модуль «Web UI» зі своїми сторінками і діями. Довірені мережі й Tailscale — глобальні модулі. */
@Module({
  imports: [BotModule, DevicesModule, WebAuthModule],
  providers: [WebUiMacModule, WebUiBot],
  exports: [WebUiMacModule],
})
export class WebUiModule {}

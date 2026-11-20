import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { MAC_BOT, macStatus } from './bot/mac-bot';
import { MAC_SETTINGS } from './constants/mac-settings';
import { buildStatusPage } from './pages/status-page';

/**
 * Системний модуль «Стан Mac»: стежить за живленням, зарядом, температурою і попереджає про них.
 * Його сторінка в системній групі меню. Awake не володіє станом, лише читає його (ctx.mac) для своєї сесії.
 */
@Injectable()
export class MacStateMacModule implements MacModule {
  readonly id = 'system';
  readonly title = 'Стан Mac';
  readonly icon = { symbol: 'waveform.path.ecg', tone: 'green' } as const;
  readonly permissions: MacModule['permissions'] = ['thermalRead'];
  readonly settings = MAC_SETTINGS;
  readonly actions: MacModule['actions'] = {};
  readonly bot = MAC_BOT;

  status(ctx: ModuleContext) {
    return macStatus(ctx.mac);
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildStatusPage(ctx)];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `system.${key}`, value }, 'web');
  }
}

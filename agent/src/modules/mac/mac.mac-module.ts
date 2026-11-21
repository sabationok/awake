import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { TrustedNetworksService } from '../../trusted-networks';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { MAC_NOTIFICATIONS } from './constants/mac-notifications';
import { macStatus } from './helpers/mac-status';
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

  constructor(
    notifications: TelegramNotificationsService,
    private readonly _networks: TrustedNetworksService,
  ) {
    notifications.register(MAC_NOTIFICATIONS);
  }

  status(ctx: ModuleContext) {
    return macStatus(ctx.mac);
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildStatusPage(ctx, this._networks.isTrusted(ctx.mac?.ssid))];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `system.${key}`, value }, 'web');
  }
}

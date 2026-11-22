import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { REMOTE_ACCESS_KEY, REMOTE_ACCESS_MODULE } from '../modules/bot/constants/remote-access';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { TAILSCALE_MODULE, TAILSCALE_SETTINGS } from './constants/tailscale-settings';
import { buildTailscalePage } from './pages/tailscale-page';
import { TailscaleService } from './services/tailscale';

/** Tailscale у MaControl: своя вкладка з перемикачем модуля і станом tailnet; вибір шляху — на Огляді Агента. */
@Injectable()
export class TailscaleMacModule implements MacModule {
  readonly id = TAILSCALE_MODULE;
  readonly title = 'Tailscale';
  readonly icon = { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = TAILSCALE_SETTINGS;

  constructor(private readonly _tailscale: TailscaleService) {}

  pages(ctx: ModuleContext): UiPage[] {
    const enabled = ctx.setting<boolean>('enabled');
    const active = enabled && ctx.setting<string>(REMOTE_ACCESS_KEY, REMOTE_ACCESS_MODULE) === 'tailscale';
    return [buildTailscalePage(this._tailscale.state, ctx.settingNode('enabled'), active)];
  }

  status(): StatusFields | null {
    const { installed, running, serving, dnsName } = this._tailscale.state;
    return installed ? { running, serving, host: serving ? dnsName : null } : null;
  }
}

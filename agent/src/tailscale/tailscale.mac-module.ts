import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import type { MacModule, StatusFields } from '../modules/types/mac-module';
import { TAILSCALE_MODULE, TAILSCALE_SETTINGS } from './constants/tailscale-settings';
import { TailscaleService } from './services/tailscale';

/** Tailscale у MaControl: лише перемикач на «Огляді» Агента і стан для /status, без своєї вкладки. */
@Injectable()
export class TailscaleMacModule implements MacModule {
  readonly id = TAILSCALE_MODULE;
  readonly title = 'Tailscale';
  readonly icon = { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = TAILSCALE_SETTINGS;

  constructor(private readonly _tailscale: TailscaleService) {}

  pages(): UiPage[] {
    return [];
  }

  status(): StatusFields | null {
    const { installed, running, serving, dnsName } = this._tailscale.state;
    return installed ? { running, serving, host: serving ? dnsName : null } : null;
  }
}

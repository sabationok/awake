import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { MAC_SETTINGS } from './constants/mac-settings';
import { buildStatusPage } from './pages/status-page';

/** Модуль «Стан Mac»: живлення, заряд, температура і попередження про них. Від сесії Awake не залежить. */
@Injectable()
export class MacStateMacModule implements MacModule {
  readonly id = 'mac';
  readonly title = 'Стан Mac';
  readonly icon = { symbol: 'waveform.path.ecg', tone: 'green' } as const;
  readonly permissions: MacModule['permissions'] = ['thermalRead'];
  readonly settings = MAC_SETTINGS;
  readonly actions: MacModule['actions'] = {};

  pages(ctx: ModuleContext): UiPage[] {
    return [buildStatusPage(ctx)];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `mac.${key}`, value }, 'web');
  }
}

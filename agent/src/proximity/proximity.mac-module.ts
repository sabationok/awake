import { Injectable } from '@nestjs/common';
import type { SettingDefinition, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { PROXIMITY_MODULE, buildProximitySettings } from './constants/proximity-settings';
import { buildProximityPage } from './pages/proximity-page';
import { ProximityService } from './services/proximity';

/** Модуль «Поруч»: блокує екран, коли вибраний iPhone чи Apple Watch відходить від Mac. Сканує Bluetooth помічник на запит сервера. */
@Injectable()
export class ProximityMacModule implements MacModule {
  readonly id = PROXIMITY_MODULE;
  readonly title = 'Поруч';
  readonly icon = { symbol: 'iphone.radiowaves.left.and.right', tone: 'indigo' } as const;
  readonly permissions: MacModule['permissions'] = [];

  constructor(private readonly _proximity: ProximityService) {}

  /** Варіанти «Пристрій» — з поточного звіту помічника, тому опис будується щоразу. */
  get settings(): SettingDefinition[] {
    return buildProximitySettings(this._proximity.deviceOptions());
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildProximityPage(ctx, this._proximity.state)];
  }

  status(): StatusFields | null {
    const { config, lastLockAt } = this._proximity.state;
    return config.enabled ? { lastLockAt } : null;
  }
}

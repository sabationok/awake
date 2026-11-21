import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { RELAY_SETTINGS } from './constants/relay-settings';
import { buildRelayPage } from './pages/relay-page';
import { RelayStateService } from './state/relay-state.service';

/** Модуль Relay у MaControl: перемикач і сесії лише в SwiftUI. Сам сокет — RelayHostService. */
@Injectable()
export class RelayMacModule implements MacModule {
  readonly id = 'relay';
  readonly title = 'Relay';
  readonly icon = { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = RELAY_SETTINGS;

  constructor(private readonly _state: RelayStateService) {}

  pages(ctx: ModuleContext): UiPage[] {
    return [buildRelayPage(ctx, this._state.state)];
  }

  status(): StatusFields {
    const { status, viewers } = this._state.state;
    return { status, viewers: viewers.length };
  }
}

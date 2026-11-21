import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { BotJournalService } from '../bot-journal';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { RELAY_SETTINGS } from './constants/relay-settings';
import { buildRelayPage } from './pages/relay-page';
import { RelayStateService } from './state/relay-state.service';

/**
 * Модуль Webhooxy у MaControl: ліміти, трекінг і сповіщення relay, лише в SwiftUI. Сам сокет — RelayHostService.
 * id лишається `relay`, щоб збережені налаштування (`relay.enabled`) і команда /relay не змінились.
 */
@Injectable()
export class RelayMacModule implements MacModule {
  readonly id = 'relay';
  readonly title = 'Webhooxy';
  readonly icon = { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = RELAY_SETTINGS;

  constructor(
    private readonly _state: RelayStateService,
    private readonly _journal: BotJournalService,
  ) {}

  pages(ctx: ModuleContext): UiPage[] {
    return [buildRelayPage(ctx, this._state.state, this._journal.metrics())];
  }

  status(): StatusFields {
    const { status, viewers } = this._state.state;
    return { status, viewers: viewers.length };
  }
}

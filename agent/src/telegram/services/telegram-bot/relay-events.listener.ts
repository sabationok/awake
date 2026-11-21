import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { debounceTime, distinctUntilChanged, skip, type Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { RELAY_STATUS_VIEW } from '../../../relay/helpers/relay-status-label';
import { RelayStateService } from '../../../relay/state/relay-state.service';
import type { RelayStateSnapshot } from '../../../relay/types/relay-status.types';
import { formatEventMessage } from '../../helpers/format-event-message';
import { TelegramBotService } from './telegram-bot.service';

/** Короткі обриви socket.io перепідключає сам: про них не пишемо. */
const SETTLE_MS = 10_000;

/** Relay став активним або перестав → Telegram. Перемикач `events.relay.status` на сторінці Telegram. */
@Injectable()
export class RelayEventsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _relay: RelayStateService,
    private readonly _bot: TelegramBotService,
  ) {}

  onModuleInit() {
    this._subscription = this._relay.state$
      .pipe(
        debounceTime(SETTLE_MS),
        distinctUntilChanged((a, b) => (a.status === 'online') === (b.status === 'online')),
        // Перший стан після запуску агента — не подія.
        skip(1),
      )
      .subscribe((state) => void this._notify(state));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private async _notify(state: RelayStateSnapshot) {
    if (!this._modules.context('telegram').setting<boolean>('events.relay.status')) return;
    const host = this._bridge.state$.value?.host ?? 'Mac';
    const active = state.status === 'online';
    const fields = { event: 'relay.status', status: state.status, reason: state.reason ?? '—' };
    const title = active ? '📡 Relay активний' : `📴 Relay неактивний: ${RELAY_STATUS_VIEW[state.status].label}`;
    await this._bot.notify(formatEventMessage(host, title, fields));
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { AppStateService } from '../services/app-state.service';
import { UiNotifyService } from '../services/ui-notify.service';

/** Mac-аппка бачить scope mac. */
const SCOPE = 'mac';

/**
 * Стейт і тости на сокеті Mac-аппки: повний — кожному новому клієнту й на `state.get`, далі патчі з `rev` і тости.
 * Layout сторінок цим каналом не йде (його шле MacUiListener).
 */
@Injectable()
export class MacStateListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscriptions: Subscription[] = [];

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _state: AppStateService,
    private readonly _notify: UiNotifyService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._bridge.appConnected$.subscribe((write) => write({ type: 'state.full', data: this._state.full(SCOPE) })),
      this._bridge.stateRequests$.subscribe(() => this._bridge.sendLive({ type: 'state.full', data: this._state.full(SCOPE) })),
      this._state.patches$.subscribe((patch) => this._bridge.sendLive({ type: 'state.patch', data: this._state.patchFor(patch, SCOPE) })),
      this._notify.notify$.subscribe((notify) => this._bridge.sendLive({ type: 'notify', data: notify })),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}

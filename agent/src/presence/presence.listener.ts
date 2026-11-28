import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { UiSyncService } from './services/ui-sync.service';

/** Новий стан від Mac → індекс і сторінки в Upstash одразу, а не на наступному такті. */
@Injectable()
export class PresenceListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _sync: UiSyncService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.state$.subscribe((state) => {
      if (state) void this._sync.sync();
    });
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { PresenceService } from './services/presence.service';

/** Кожен новий стан від Mac → публікація в Upstash. */
@Injectable()
export class PresenceListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _presence: PresenceService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.state$.subscribe((state) => {
      if (state) void this._presence.publish(state);
    });
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

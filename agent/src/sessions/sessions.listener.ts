import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { SessionsService } from './sessions.service';

/** Події сесій від Mac-аппки → SessionsService. */
@Injectable()
export class SessionsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _sessions: SessionsService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.sessions$.subscribe((event) => this._sessions.applyEvent(event));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

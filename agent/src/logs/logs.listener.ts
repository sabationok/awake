import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { LogsService } from './logs.service';

/** Рядки журналу від Mac-аппки → SQLite. */
@Injectable()
export class LogsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _logs: LogsService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.logs$.subscribe((line) => this._logs.create(line));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

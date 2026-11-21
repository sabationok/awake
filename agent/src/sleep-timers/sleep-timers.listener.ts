import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { SleepTimersService } from './sleep-timers.service';

/** Події таймера сну від Mac-аппки → SleepTimersService. */
@Injectable()
export class SleepTimersListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _timers: SleepTimersService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.sleepTimers$.subscribe((event) => this._timers.applyEvent(event));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

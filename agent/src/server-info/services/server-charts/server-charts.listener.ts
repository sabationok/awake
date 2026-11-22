import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ServerChartsService } from './server-charts.service';

/** Mac-аппка попросила графіки «Сервера» за період → усе вікно, далі тіки цього періоду. */
@Injectable()
export class ServerChartsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _charts: ServerChartsService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.serverCharts$.subscribe(({ period }) => this._charts.subscribe(period));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

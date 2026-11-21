import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { EnvifyService } from './envify.service';

/** Аппка зберегла токен Envify або натиснула «Оновити» → агент заново тягне змінні. */
@Injectable()
export class EnvifyListener implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _envify: EnvifyService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.envifyReload$.subscribe(() => void this._envify.reload());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

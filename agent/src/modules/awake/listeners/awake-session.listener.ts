import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { distinctUntilChanged, filter, map, pairwise, type Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../modules.service';
import { SESSION_START_OPTIONS } from '../constants/start-options';

/**
 * Перемикачі старту належать одній сесії, а не всім: коли сесія скінчилась (таймер, стоп, батарея),
 * вони повертаються у «вимкнено». Офлайн (стан null) не вважаємо кінцем сесії.
 */
@Injectable()
export class AwakeSessionListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.state$
      .pipe(
        filter((state) => state !== null),
        map((state) => state.active),
        distinctUntilChanged(),
        pairwise(),
        filter(([was, now]) => was && !now),
      )
      .subscribe(() => void this._reset());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private async _reset() {
    const ctx = this._modules.context('awake');
    for (const key of SESSION_START_OPTIONS) {
      if (ctx.setting<boolean>(key)) {
        await this._modules.dispatch({ type: 'setting', change: { module: 'awake', key, value: false } }, 'mac');
      }
    }
  }
}

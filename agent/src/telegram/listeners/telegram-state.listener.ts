import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { skip, type Subscription } from 'rxjs';
import { ModulesService } from '../../modules/modules.service';
import { TelegramStateService } from '../state/telegram-state.service';

/** Старт чи зупинка polling-у перебудовує сторінки: стан на сторінці Telegram живий. */
@Injectable()
export class TelegramStateListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _state: TelegramStateService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = this._state.state$.pipe(skip(1)).subscribe(() => this._modules.treeChanged$.next());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

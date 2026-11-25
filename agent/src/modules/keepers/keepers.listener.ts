import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { ModulesService } from '../modules.service';
import { KeepersService } from './keepers.service';

/** Список утримувачів змінився → дерево UI перебудовується. */
@Injectable()
export class KeepersListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _keepers: KeepersService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = this._keepers.changed$.subscribe(() => this._modules.treeChanged$.next());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

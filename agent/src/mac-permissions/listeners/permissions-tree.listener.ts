import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { ModulesService } from '../../modules/modules.service';
import { MacPermissionsService } from '../mac-permissions.service';

/** Дозволи змінились → сторінки перебудовуються, і сторінку «Дозволи» отримують усі клієнти. */
@Injectable()
export class PermissionsTreeListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _permissions: MacPermissionsService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = this._permissions.changed$.subscribe(() => this._modules.treeChanged$.next());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

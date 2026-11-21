import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, merge, Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { RelayHostService } from './relay-host.service';

/** Перемикач relay → host підключається або відпускає кімнату; новий стан Mac чи налаштування → дерево viewer-ам. */
@Injectable()
export class RelayHostListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscriptions: Subscription[] = [];

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _relay: RelayHostService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._modules.settingChanged$
        .pipe(filter((change) => change.module === 'relay' && change.key === 'enabled'))
        .subscribe((change) => this._relay.setEnabled(change.value === true)),
      merge(this._bridge.state$, this._modules.settingChanged$).subscribe(() => void this._relay.broadcastTree()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}

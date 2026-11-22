import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, filter, interval } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { PROXIMITY_MODULE } from '../../constants/proximity-settings';
import { PROXIMITY_TICK_MS } from '../../constants/proximity-limits';
import { ProximityService } from './proximity.service';

/** Звіт аппки, щосекундна перевірка, зміна налаштувань і стану сесії → ProximityService; його зміни → нове дерево. */
@Injectable()
export class ProximityListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _proximity: ProximityService,
  ) {}

  onModuleInit() {
    this._subscription.add(this._bridge.proximity$.subscribe((report) => this._proximity.update(report)));
    this._subscription.add(interval(PROXIMITY_TICK_MS).subscribe(() => this._proximity.evaluate()));
    this._subscription.add(
      this._modules.settingChanged$
        .pipe(filter((change) => change.module === PROXIMITY_MODULE))
        .subscribe(() => this._proximity.reset()),
    );
    this._subscription.add(this._proximity.changed$.subscribe(() => this._modules.treeChanged$.next()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }
}

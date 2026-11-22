import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, filter, interval, skip } from 'rxjs';
import { ModulesService } from '../../../modules/modules.service';
import { TAILSCALE_MODULE, TAILSCALE_POLL_MS } from '../../constants/tailscale-settings';
import { TailscaleService } from './tailscale.service';

/** Старт і перемикач → serve on/off; раз на TAILSCALE_POLL_MS → перечитати стан; зміна стану → нове дерево. */
@Injectable()
export class TailscaleListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _modules: ModulesService,
    private readonly _tailscale: TailscaleService,
  ) {}

  onModuleInit() {
    const enabled = () => this._modules.context(TAILSCALE_MODULE).setting<boolean>('enabled');
    // Вимкнений перемикач на старті serve не чіпає: можливо, його налаштували руками.
    void (enabled() ? this._tailscale.apply(true) : this._tailscale.refresh());
    this._subscription.add(interval(TAILSCALE_POLL_MS).subscribe(() => void this._tailscale.refresh()));
    this._subscription.add(
      this._modules.settingChanged$
        .pipe(filter((change) => change.module === TAILSCALE_MODULE && change.key === 'enabled'))
        .subscribe((change) => void this._tailscale.apply(change.value === true)),
    );
    this._subscription.add(this._tailscale.state$.pipe(skip(1)).subscribe(() => this._modules.treeChanged$.next()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, filter, interval, skip } from 'rxjs';
import { ModulesService } from '../../../modules/modules.service';
import { REMOTE_ACCESS_KEY, REMOTE_ACCESS_MODULE } from '../../../modules/bot/constants/remote-access';
import { TAILSCALE_MODULE, TAILSCALE_POLL_MS } from '../../constants/tailscale-settings';
import { TailscaleService } from './tailscale.service';

/**
 * Старт, перемикач модуля і «Віддалений доступ» на Огляді → serve on/off (лише коли модуль увімкнено і вибрано Tailscale);
 * раз на TAILSCALE_POLL_MS → перечитати стан; зміна стану → нове дерево.
 */
@Injectable()
export class TailscaleListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _modules: ModulesService,
    private readonly _tailscale: TailscaleService,
  ) {}

  onModuleInit() {
    const ctx = () => this._modules.context(TAILSCALE_MODULE);
    const wanted = () => ctx().setting<boolean>('enabled') && ctx().setting<string>(REMOTE_ACCESS_KEY, REMOTE_ACCESS_MODULE) === 'tailscale';
    // Невибраний Tailscale на старті serve не чіпає: можливо, його налаштували руками.
    void (wanted() ? this._tailscale.apply(true) : this._tailscale.refresh());
    this._subscription.add(interval(TAILSCALE_POLL_MS).subscribe(() => void this._tailscale.refresh()));
    this._subscription.add(
      this._modules.settingChanged$
        .pipe(
          filter(
            (change) =>
              (change.module === TAILSCALE_MODULE && change.key === 'enabled') ||
              (change.module === REMOTE_ACCESS_MODULE && change.key === REMOTE_ACCESS_KEY),
          ),
        )
        .subscribe(() => void this._tailscale.apply(wanted())),
    );
    this._subscription.add(this._tailscale.state$.pipe(skip(1)).subscribe(() => this._modules.treeChanged$.next()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }
}

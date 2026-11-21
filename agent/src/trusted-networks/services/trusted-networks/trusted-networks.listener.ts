import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { TrustedNetworksService } from './trusted-networks.service';

/** Аппка додала чи прибрала мережу → SQLite; будь-яка зміна → знімок аппці й нове дерево («Мережа · довірена»). */
@Injectable()
export class TrustedNetworksListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _networks: TrustedNetworksService,
  ) {}

  onModuleInit() {
    this._subscription.add(
      this._bridge.trustedNetworks$.subscribe((request) => {
        if (typeof request?.ssid !== 'string') return;
        if (request.action === 'add') this._networks.add(request.ssid);
        if (request.action === 'remove') this._networks.remove(request.ssid);
      }),
    );
    this._subscription.add(
      this._networks.changed$.subscribe(() => {
        this._push();
        this._modules.treeChanged$.next();
      }),
    );
    this._push();
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }

  private _push() {
    this._bridge.sendTrustedNetworks(this._networks.list());
  }
}

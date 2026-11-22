import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { merge, Subscription } from 'rxjs';
import { EnvifyService } from '../../../envify';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { AppSecretsService } from './app-secrets.service';

/** Аппка переписала secrets.env чи Envify віддав нове → перечитати; аппці — звідки кожен секрет і стан Envify. */
@Injectable()
export class AppSecretsListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _secrets: AppSecretsService,
    private readonly _envify: EnvifyService,
    private readonly _bridge: MacBridgeService,
  ) {}

  onModuleInit() {
    this._subscription.add(
      merge(this._bridge.relayEnvReload$, this._envify.changed$).subscribe(() => {
        this._secrets.reload();
        this._push();
      }),
    );
    this._push();
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }

  private _push() {
    this._bridge.sendSecrets({ envify: this._envify.status, keys: this._secrets.keys });
  }
}

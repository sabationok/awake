import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, merge, Subscription } from 'rxjs';
import { PairingService } from '../../../devices/services/pairing.service';
import { EnvifyService } from '../../../envify';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { RelayHostService } from './relay-host.service';

/** Перемикач relay → host підключається або відпускає кімнату; новий relay.env чи змінні Envify → перечитати й перепідключитись; новий стан Mac чи налаштування → дерево viewer-ам; відкликали пристрій → вигнати його сесії. */
@Injectable()
export class RelayHostListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscriptions: Subscription[] = [];

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _relay: RelayHostService,
    private readonly _envify: EnvifyService,
    private readonly _pairing: PairingService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._modules.settingChanged$
        .pipe(filter((change) => change.module === 'relay' && change.key === 'enabled'))
        .subscribe((change) => this._relay.setEnabled(change.value === true)),
      this._modules.settingChanged$
        .pipe(filter((change) => change.module === 'relay' && change.key.startsWith('limits.')))
        .subscribe(() => void this._relay.applyLimits()),
      merge(this._bridge.relayEnvReload$, this._envify.changed$).subscribe(() => this._relay.reloadEnv()),
      merge(this._bridge.state$, this._modules.settingChanged$).subscribe(() => void this._relay.broadcastTree()),
      // Список пристроїв змінився (зокрема відкликання): живі сесії відкликаних — геть.
      this._pairing.changed$.subscribe(() => void this._relay.kickRevokedDevices().catch(() => undefined)),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}

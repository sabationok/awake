import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { merge, Subscription } from 'rxjs';
import { PairingService } from '../../devices/services/pairing.service';
import { ModulesService } from '../../modules/modules.service';
import { WebSessionsService } from '../../web-auth/services/web-sessions.service';

/** Змінились пристрої, запити сполучення чи вебсесії → сторінки «Web UI» перебудовуються в усіх клієнтів. */
@Injectable()
export class WebUiTreeListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _pairing: PairingService,
    private readonly _sessions: WebSessionsService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = merge(this._pairing.changed$, this._sessions.changed$).subscribe(() => this._modules.treeChanged$.next());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}

import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, filter, interval } from 'rxjs';
import { AGENT_CONFIG, AgentConfig } from '../../../config/agent-config';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { MacHelperService } from '../../../mac-helper/mac-helper.service';
import { ModulesService } from '../../../modules/modules.service';
import { NO_DEVICE, PROXIMITY_MODULE } from '../../constants/proximity-settings';
import { PROXIMITY_TICK_MS } from '../../constants/proximity-limits';
import { ProximityService } from './proximity.service';

/**
 * Звіт помічника, щосекундна перевірка, зміна налаштувань і стану сесії → ProximityService; його зміни → нове дерево.
 * Standalone: сканувати чи ні, вирішує сервер — вмикає `bluetoothScan` у помічнику за `proximity.enabled` і повторює
 * запит після кожного перезапуску помічника.
 */
@Injectable()
export class ProximityListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(ProximityListener.name);
  private readonly _subscription = new Subscription();
  /** Останній надісланий помічнику запит: однаковий повторно не шлемо. */
  private _scan = '';

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _helper: MacHelperService,
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
        .subscribe(() => {
          this._proximity.reset();
          this._syncScan();
        }),
    );
    if (this._config.standalone) {
      this._subscription.add(
        this._helper.started$.subscribe(() => {
          this._scan = '';
          this._syncScan();
        }),
      );
    }
    this._subscription.add(this._proximity.changed$.subscribe(() => this._modules.treeChanged$.next()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }

  private _syncScan() {
    if (!this._config.standalone) return;
    const { enabled, device } = this._proximity.config;
    const target = device === NO_DEVICE ? '' : device;
    const key = `${enabled}|${target}`;
    if (key === this._scan) return;
    this._scan = key;
    void this._helper.run('bluetoothScan', enabled, target).then((result) => {
      if (result.ok) return;
      // Старий помічник (0.1.0) дії не знає: тоді «Поруч» живиться звітами старої аппки.
      this._logger.warn(`bluetoothScan: ${result.error ?? 'помічник не відповів'}`);
      this._scan = '';
    });
  }
}

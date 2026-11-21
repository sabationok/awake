import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, debounceTime, merge } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { ModulesService } from './modules.service';

/**
 * SwiftUI-рендерер Mac-аппки: дерево (scope mac) і знімок налаштувань ідуть у stdout,
 * натискання приходять зі stdin і виконуються як дії з джерелом mac.
 */
@Injectable()
export class MacUiListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MacUiListener.name);
  private readonly _subscriptions: Subscription[] = [];
  private _lastTree = '';
  private _settingsSent = false;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._bridge.events$.subscribe((event) => void this._apply(event)),
      this._modules.settingChanged$.subscribe(() => this._bridge.sendSettings(this._modules.settingsSnapshot())),
      // Стан, журнал і сесії міняють дерево; збираємо сплеск змін в одне оновлення.
      merge(this._bridge.state$, this._bridge.logs$, this._bridge.sessions$, this._modules.settingChanged$, this._modules.treeChanged$)
        .pipe(debounceTime(150))
        .subscribe(() => void this._pushTree()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private async _apply(event: Parameters<ModulesService['dispatch']>[0]) {
    try {
      await this._modules.dispatch(event, 'mac');
    } catch (error) {
      this._logger.warn(`event from Mac rejected: ${(error as Error).message}`);
    }
    await this._pushTree();
  }

  private async _pushTree() {
    // Перший стан від Mac: аппка щойно запустилась і ще не знає налаштувань.
    if (!this._settingsSent && this._bridge.state) {
      this._bridge.sendSettings(this._modules.settingsSnapshot());
      this._settingsSent = true;
    }
    const tree = await this._modules.buildTree('mac');
    const fingerprint = JSON.stringify({ ...tree, app: { ...tree.app, updatedAt: '' } });
    if (fingerprint === this._lastTree) return;
    this._lastTree = fingerprint;
    this._bridge.sendTree(tree);
  }
}

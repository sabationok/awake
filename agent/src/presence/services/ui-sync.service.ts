import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UI_TREE_KEY } from '@awake/contracts';
import type { UiTree } from '@awake/contracts';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../modules/modules.service';
import { PresenceService } from './presence.service';
import { UpstashClient } from './upstash.client';

/** Дерево без змін публікуємо раз на хвилину; ключ живе довше, щоб пережити пропущений пульс. */
const HEARTBEAT_MS = 60_000;
const TREE_TTL_SECONDS = 150;

/**
 * Upstash для дашборду на Vercel: лише дерево UI (scope all) і локальна адреса пульта.
 * Дій з Vercel немає: керування йде на пульті самого агента в довіреній Wi-Fi.
 */
@Injectable()
export class UiSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(UiSyncService.name);
  private _lastTree = '';
  private _lastAt = 0;
  private _timers: NodeJS.Timeout[] = [];
  private _failing = false;

  constructor(
    private readonly _upstash: UpstashClient,
    private readonly _modules: ModulesService,
    private readonly _bridge: MacBridgeService,
    private readonly _presence: PresenceService,
  ) {}

  onModuleInit() {
    if (!this._upstash.isConfigured) return;
    this._timers.push(setInterval(() => void this.publishTree(), 5_000));
  }

  onModuleDestroy() {
    this._timers.forEach(clearInterval);
  }

  async publishTree() {
    const tree = await this._modules.buildTree('all');
    const state = this._bridge.state;
    const withUrl: UiTree = { ...tree, app: { ...tree.app, localUrl: state ? this._presence.localUrl(state) : null } };
    // updatedAt і код у localUrl міняються самі собою: порівнюємо без них.
    const fingerprint = JSON.stringify({ ...withUrl, app: { ...withUrl.app, updatedAt: '', localUrl: !!withUrl.app.localUrl } });
    const now = Date.now();
    if (fingerprint === this._lastTree && now - this._lastAt < HEARTBEAT_MS) return;
    await this._run(async () => {
      await this._upstash.command(['SET', UI_TREE_KEY, JSON.stringify(withUrl), 'EX', TREE_TTL_SECONDS]);
      this._lastTree = fingerprint;
      this._lastAt = now;
    });
  }

  private async _run(task: () => Promise<void>) {
    try {
      await task();
      if (this._failing) this._logger.log('Upstash recovered');
      this._failing = false;
    } catch (error) {
      if (!this._failing) this._logger.warn(`Upstash failed: ${(error as Error).message}`);
      this._failing = true;
    }
  }
}

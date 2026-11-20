import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UI_EVENTS_KEY, UI_TREE_KEY, UI_WATCH_KEY } from '@awake/contracts';
import type { UiEvent, UiTree } from '@awake/contracts';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../modules/modules.service';
import { isUiEvent } from '../../modules/helpers/is-ui-event';
import { PresenceService } from './presence.service';
import { UpstashClient } from './upstash.client';

/** Дерево без змін публікуємо раз на хвилину; ключ живе довше, щоб пережити пропущений пульс. */
const HEARTBEAT_MS = 60_000;
const TREE_TTL_SECONDS = 150;
/** Як часто перевіряти, чи хтось дивиться дашборд, і як часто тоді читати чергу. */
const WATCH_CHECK_MS = 10_000;
const EVENTS_POLL_MS = 2_000;

/**
 * Upstash для дашборду на Vercel: дерево UI (лише scope all) туди, події з кнопок звідти.
 * Чергу читаємо часто лише поки дашборд відкритий, щоб не з'їсти ліміт команд Upstash.
 */
@Injectable()
export class UiSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(UiSyncService.name);
  private _lastTree = '';
  private _lastAt = 0;
  private _watching = false;
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
    this._timers.push(setInterval(() => void this._checkWatch(), WATCH_CHECK_MS));
    this._timers.push(setInterval(() => this._watching && void this._drainEvents(), EVENTS_POLL_MS));
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

  private async _checkWatch() {
    await this._run(async () => {
      const watching = (await this._upstash.command(['EXISTS', UI_WATCH_KEY])) === 1;
      // Хтось відкрив дашборд: одразу свіже дерево, не чекаючи пульсу.
      if (watching && !this._watching) this._lastAt = 0;
      this._watching = watching;
    });
  }

  private async _drainEvents() {
    await this._run(async () => {
      for (let i = 0; i < 10; i++) {
        const raw = await this._upstash.command(['RPOP', UI_EVENTS_KEY]);
        if (typeof raw !== 'string') return;
        await this._apply(raw);
      }
    });
  }

  private async _apply(raw: string) {
    let event: UiEvent;
    try {
      event = JSON.parse(raw) as UiEvent;
    } catch {
      return;
    }
    if (!isUiEvent(event)) return;
    try {
      await this._modules.dispatch(event, 'web');
      this._lastAt = 0;
      await this.publishTree();
    } catch (error) {
      this._logger.warn(`remote event rejected: ${(error as Error).message}`);
    }
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

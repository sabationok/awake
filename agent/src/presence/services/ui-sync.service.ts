import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UI_ALIVE_KEY, UI_TREE_KEY } from '@awake/contracts';
import type { UiAlive, UiTree } from '@awake/contracts';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../modules/modules.service';
import { WEB_UI_MODULE } from '../../web-ui/constants/web-ui';
import { HEARTBEAT_OFF } from '../../web-ui/constants/web-ui-settings';
import { PresenceService } from './presence.service';
import { UpstashClient } from './upstash.client';

/** Як часто локально звіряти дерево з опублікованим. У Upstash іде лише зміна. */
const CHECK_MS = 5_000;
/** Дерево без пульсу не протухає: Vercel показує останнє, а онлайн чи ні — каже пульс. Тиждень — щоб не лишалось сміття. */
const TREE_TTL_SECONDS = 7 * 24 * 3600;
/** Ключ пульсу живе 2,5 інтервалу: один пропущений пульс ще не офлайн. */
const ALIVE_TTL_FACTOR = 2.5;

/**
 * Upstash для Web UI на Vercel: дерево UI (scope all) з локальною адресою і окремо пульс агента.
 * Дерево пишеться лише тоді, коли змінилось (і на старті); пульс — з інтервалом із налаштування Web UI «Пульс для Vercel».
 * Дій з Vercel немає: керування йде у Web UI самого агента.
 */
@Injectable()
export class UiSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(UiSyncService.name);
  private _lastTree = '';
  private _lastBeatAt = 0;
  /** Інтервал, з яким писали пульс востаннє: зміна налаштування пише пульс одразу. undefined — ще не писали. */
  private _lastEvery: number | null | undefined = undefined;
  private _timer: NodeJS.Timeout | null = null;
  private _failing = false;

  constructor(
    private readonly _upstash: UpstashClient,
    private readonly _modules: ModulesService,
    private readonly _bridge: MacBridgeService,
    private readonly _presence: PresenceService,
  ) {}

  onModuleInit() {
    if (!this._upstash.isConfigured) return;
    this._timer = setInterval(() => void this.sync(), CHECK_MS);
    void this.sync();
  }

  async onModuleDestroy() {
    if (this._timer) clearInterval(this._timer);
    if (!this._upstash.isConfigured) return;
    // Сервер зупиняється сам: Vercel одразу бачить офлайн, а не чекає, поки ключ протухне.
    await this._run(() => this._upstash.command(['DEL', UI_ALIVE_KEY]).then(() => undefined));
  }

  async sync() {
    if (!this._upstash.isConfigured) return;
    await this._publishTree();
    await this._beat();
  }

  private async _publishTree() {
    const tree = await this._modules.buildTree('all');
    const state = this._bridge.state;
    const withLocal: UiTree = { ...tree, app: { ...tree.app, local: state ? this._presence.localAccess(state) : null } };
    // updatedAt міняється на кожному збиранні: без нього відбиток рівний, коли зміст той самий.
    const fingerprint = JSON.stringify({ ...withLocal, app: { ...withLocal.app, updatedAt: '' } });
    if (fingerprint === this._lastTree) return;
    await this._run(async () => {
      await this._upstash.command(['SET', UI_TREE_KEY, JSON.stringify(withLocal), 'EX', TREE_TTL_SECONDS]);
      this._lastTree = fingerprint;
    });
  }

  private async _beat() {
    const every = this._heartbeatSeconds();
    const now = Date.now();
    const changed = every !== this._lastEvery;
    if (!changed && (every === null || now - this._lastBeatAt < every * 1000)) return;
    const alive: UiAlive = { at: new Date(now).toISOString(), every };
    // Вимкнений пульс пишеться один раз без TTL: Vercel знає, що стан невідомий, а не що агент упав.
    const args = every === null ? ['SET', UI_ALIVE_KEY, JSON.stringify(alive)] : ['SET', UI_ALIVE_KEY, JSON.stringify(alive), 'EX', Math.ceil(every * ALIVE_TTL_FACTOR)];
    await this._run(async () => {
      await this._upstash.command(args);
      this._lastBeatAt = now;
      this._lastEvery = every;
    });
  }

  private _heartbeatSeconds(): number | null {
    const value = this._modules.context(WEB_UI_MODULE).setting<string>('heartbeat');
    const seconds = Number(value);
    return value === HEARTBEAT_OFF || !Number.isFinite(seconds) || seconds <= 0 ? null : seconds;
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

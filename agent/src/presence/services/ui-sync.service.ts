import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { uiKeys, uiNamespace, uiTtlSeconds } from '@awake/contracts';
import type { UiAlive } from '@awake/contracts';
import { ModulesService } from '../../modules/modules.service';
import { WEB_UI_MODULE } from '../../web-ui/constants/web-ui';
import { HEARTBEAT_OFF } from '../../web-ui/constants/web-ui-settings';
import { UpstashClient } from './upstash.client';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { readBuildInfo } from '../../app-update/helpers/read-build-info';

/** Як часто локально звіряти індекс і сторінки з опублікованими. У Upstash іде лише зміна. */
const CHECK_MS = 5_000;
/** Ключ пульсу живе 2,5 інтервалу: один пропущений пульс ще не офлайн. */
const ALIVE_TTL_FACTOR = 2.5;

/**
 * Upstash для Web UI на Vercel (scope all), у просторі ключів цієї збірки (`uiNamespace(stage, гілка)`): індекс
 * роутів, кожна сторінка під своїм ключем і окремо пульс агента. Індекс і сторінки без пульсу не протухають до TTL
 * простору (90 днів stage, тиждень гілка): Vercel показує останнє, а онлайн чи ні — каже пульс. Пишеться лише те, чий `rev` змінився (і все на старті); сторінка, якої
 * більше немає, стирається. Пульс — з інтервалом із налаштування Web UI «Пульс для Vercel».
 * Дій з Vercel немає: керування йде у Web UI самого агента.
 */
@Injectable()
export class UiSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(UiSyncService.name);
  private _shellRev = '';
  /** Сторінка → `rev`, уже записаний в Upstash. */
  private readonly _pageRevs = new Map<string, string>();
  private _lastBeatAt = 0;
  /** Інтервал, з яким писали пульс востаннє: зміна налаштування пише пульс одразу. undefined — ще не писали. */
  private _lastEvery: number | null | undefined = undefined;
  private _timer: NodeJS.Timeout | null = null;
  private _failing = false;

  private readonly _keys: ReturnType<typeof uiKeys>;
  private readonly _ttl: number;

  constructor(
    private readonly _upstash: UpstashClient,
    private readonly _modules: ModulesService,
    @Inject(AGENT_CONFIG) config: AgentConfig,
  ) {
    const branch = process.env.MACONTROL_BRANCH || readBuildInfo()?.branch || null;
    const ns = uiNamespace(config.stage, branch);
    this._keys = uiKeys(ns);
    this._ttl = uiTtlSeconds(ns);
  }

  onModuleInit() {
    if (!this._upstash.isConfigured) return;
    this._timer = setInterval(() => void this.sync(), CHECK_MS);
    void this.sync();
  }

  async onModuleDestroy() {
    if (this._timer) clearInterval(this._timer);
    if (!this._upstash.isConfigured) return;
    // Сервер зупиняється сам: Vercel одразу бачить офлайн, а не чекає, поки ключ протухне.
    await this._run(() => this._upstash.command(['DEL', this._keys.alive]).then(() => undefined));
  }

  async sync() {
    if (!this._upstash.isConfigured) return;
    await this._publishLayout();
    await this._beat();
  }

  private async _publishLayout() {
    const { shell, pages } = await this._modules.buildAll('all');
    const ids = new Set(pages.map((page) => page.id));
    for (const page of pages) {
      if (this._pageRevs.get(page.id) === page.rev) continue;
      await this._run(async () => {
        await this._upstash.command(['SET', this._keys.page(page.id), JSON.stringify(page), 'EX', this._ttl]);
        this._pageRevs.set(page.id, page.rev);
      });
    }
    for (const id of [...this._pageRevs.keys()].filter((known) => !ids.has(known))) {
      await this._run(async () => {
        await this._upstash.command(['DEL', this._keys.page(id)]);
        this._pageRevs.delete(id);
      });
    }
    // Індекс — після сторінок: Vercel не побачить у меню сторінку, якої ще немає в Upstash.
    if (shell.rev === this._shellRev) return;
    await this._run(async () => {
      await this._upstash.command(['SET', this._keys.shell, JSON.stringify(shell), 'EX', this._ttl]);
      this._shellRev = shell.rev;
    });
  }

  private async _beat() {
    const every = this._heartbeatSeconds();
    const now = Date.now();
    const changed = every !== this._lastEvery;
    if (!changed && (every === null || now - this._lastBeatAt < every * 1000)) return;
    const alive: UiAlive = { at: new Date(now).toISOString(), every };
    // Вимкнений пульс пишеться один раз без TTL: Vercel знає, що стан невідомий, а не що агент упав.
    const args = every === null ? ['SET', this._keys.alive, JSON.stringify(alive)] : ['SET', this._keys.alive, JSON.stringify(alive), 'EX', Math.ceil(every * ALIVE_TTL_FACTOR)];
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

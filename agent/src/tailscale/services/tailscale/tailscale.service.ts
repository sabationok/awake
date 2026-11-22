import { Inject, Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { TransportsService } from '../../../transports';
import { isServingPort } from '../../helpers/is-serving-port';
import { parseTailscaleStatus } from '../../helpers/parse-tailscale-status';
import { findTailscaleCli, runTailscale } from '../../helpers/run-tailscale';
import type { TailscaleState } from '../../types/tailscale-state.types';

const INITIAL: TailscaleState = { installed: false, running: false, dnsName: null, login: null, serving: false, error: null };

/**
 * Tailscale як проксі до вебу: `tailscale serve` веде https://<mac>.ts.net на tailnet-порт агента (TLS — у Tailscale).
 * serve веде на окремий порт агента лише на 127.0.0.1 (`tailnetPort`), тож запит туди — завжди з tailnet.
 */
@Injectable()
export class TailscaleService {
  private readonly _logger = new Logger(TailscaleService.name);
  readonly state$ = new BehaviorSubject<TailscaleState>(INITIAL);

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    transports: TransportsService,
  ) {
    transports.registerProxy({
      protocol: 'http',
      provider: 'tailscale',
      via: 'web',
      title: 'Tailscale',
      icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
      status: () => {
        const state = this.state;
        if (!state.installed) return { online: false, hint: 'Tailscale не встановлено' };
        if (!state.running) return { online: false, hint: state.error ?? 'Mac не в tailnet' };
        return { online: state.serving, hint: state.serving ? `https://${state.dnsName}` : 'serve вимкнено' };
      },
    });
  }

  get state(): TailscaleState {
    return this.state$.value;
  }

  /** Можна приймати запити з tailnet: Mac у tailnet і serve веде на агента. */
  get isServing(): boolean {
    return this.state.running && this.state.serving;
  }

  /** Запит з tailnet від власника Mac. Інші логіни tailnet (спільні пристрої, друзі) не пускаємо. */
  isOwner(login: string | null): boolean {
    return !!login && !!this.state.login && login.toLowerCase() === this.state.login.toLowerCase();
  }

  async refresh() {
    const cli = findTailscaleCli();
    if (!cli) return this._set({ ...INITIAL });
    try {
      const status = parseTailscaleStatus(await runTailscale(cli, ['status', '--json']));
      const serving = status.running ? isServingPort(await runTailscale(cli, ['serve', 'status', '--json']), this._config.tailnetPort) : false;
      this._set({ installed: true, ...status, serving, error: null });
    } catch (error) {
      this._set({ ...INITIAL, installed: true, error: (error as Error).message });
    }
  }

  /** Перемикач «Через Tailscale»: вмикає serve на tailnet-порт агента або прибирає його. Чужий serve на 443 не чіпаємо. */
  async apply(enabled: boolean) {
    await this.refresh();
    const cli = findTailscaleCli();
    const { running, serving } = this.state;
    if (!cli || !running || enabled === serving) return;
    try {
      if (enabled) await runTailscale(cli, ['serve', '--bg', '--https=443', `http://127.0.0.1:${this._config.tailnetPort}`]);
      else await runTailscale(cli, ['serve', '--https=443', 'off']);
      this._logger.log(`tailscale serve ${enabled ? 'on' : 'off'}`);
    } catch (error) {
      this._logger.warn(`tailscale serve failed: ${(error as Error).message}`);
      this._set({ ...this.state, error: (error as Error).message });
    }
    await this.refresh();
  }

  private _set(state: TailscaleState) {
    if (JSON.stringify(state) !== JSON.stringify(this.state)) this.state$.next(state);
  }
}

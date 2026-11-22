import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Subscription, distinctUntilChanged, map, merge } from 'rxjs';
import type { DevicePairing, DevicePairingMode, DevicesSnapshot } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { RelayStateService } from '../../relay/state/relay-state.service';
import { TrustedNetworksService } from '../../trusted-networks';
import { findLanAddress } from '../../presence/helpers/find-lan-address';
import { describeUserAgent } from '../helpers/describe-user-agent';
import { DevicesRepository } from '../repositories/devices.repository';
import { PairingService } from './pairing.service';

/**
 * Сторінка «Пристрої» в Mac-аппці: шле їй список сполучених пристроїв і посилання з кодом, виконує відкликання.
 * Іде лише через stdin/stdout, тобто лише з цього Mac: сполучений пристрій не може керувати іншими.
 */
@Injectable()
export class DevicesBridgeService implements OnModuleInit, OnModuleDestroy {
  private _subscription?: Subscription;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _bridge: MacBridgeService,
    private readonly _devices: DevicesRepository,
    private readonly _pairing: PairingService,
    private readonly _networks: TrustedNetworksService,
    private readonly _relay: RelayStateService,
  ) {}

  onModuleInit() {
    const trustedChanged = merge(this._bridge.state$, this._networks.changed$).pipe(
      map(() => this._networks.isCurrentTrusted),
      distinctUntilChanged(),
    );
    const relayOnlineChanged = this._relay.state$.pipe(
      map((state) => state.status === 'online'),
      distinctUntilChanged(),
    );
    this._subscription = merge(trustedChanged, relayOnlineChanged, this._pairing.changed$).subscribe(() => this._push());
    this._subscription.add(
      this._bridge.devices$.subscribe((request) => {
        if (request.action === 'revoke') this._pairing.revoke(request.id);
        if (request.action === 'answer') this._pairing.answer(request.requestId, request.approve);
        // resetCodes сам шле changed$, тобто й знімок.
        if (request.action === 'newCode') return this._pairing.resetCodes();
        this._push();
      }),
    );
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private _push() {
    this._bridge.sendDevices(this._snapshot());
  }

  private _snapshot(): DevicesSnapshot {
    const devices = this._devices.list().map((device) => ({ ...device, name: describeUserAgent(device.userAgent) }));
    const requests = this._pairing.pendingRequests().map((request) => ({ ...request, name: describeUserAgent(request.userAgent) }));
    return { devices, requests, pairing: { local: this._localLink(), remote: this._remoteLink() } };
  }

  /**
   * Локальне посилання: простий http на LAN-адресі. Поза довіреною Wi-Fi гард однаково не пустить, тож його й не даємо:
   * у чужій мережі http-трафік з токеном можна підслухати, туди — дистанційне сполучення.
   */
  private _localLink(): DevicePairing {
    if (!this._networks.isCurrentTrusted) return { url: null, reason: 'untrusted' };
    const address = findLanAddress();
    if (!address) return { url: null, reason: 'noNetwork' };
    return this._link('local', `http://${address}:${this._config.httpPort}/`);
  }

  /** Дистанційне: сторінка /pair дашборду на Vercel, яка йде до Mac через relay. Без relay онлайн до Mac не достукатись. */
  private _remoteLink(): DevicePairing {
    const dashboard = this._config.dashboardOrigins[0];
    if (!dashboard || this._relay.state.status !== 'online') return { url: null, reason: 'relayOff' };
    return this._link('remote', `${dashboard}/pair`);
  }

  private _link(mode: DevicePairingMode, base: string): DevicePairing {
    const code = this._pairing.currentCodeInfo(mode);
    return { url: `${base}#p=${code.value}`, expiresAt: new Date(code.expiresAt).toISOString() };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { MacState, UiLocalAccess } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { PairingService } from '../../devices/services/pairing.service';
import { TlsService } from '../../tls/services/tls.service';
import { TrustedNetworksService } from '../../trusted-networks';
import { findLanAddress } from '../helpers/find-lan-address';

/** Прямий доступ до агента для дашборду: лише в довіреній Wi-Fi. */
@Injectable()
export class PresenceService {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _pairing: PairingService,
    private readonly _tls: TlsService,
    private readonly _networks: TrustedNetworksService,
  ) {}

  /**
   * HTTPS-адреса агента з одноразовим кодом сполучення і CA, якому дашборд має довіряти.
   * Головний токен з Mac не виходить: сторінка міняє код на власний токен пристрою, а код швидко протухає.
   */
  localAccess(state: MacState): UiLocalAccess | null {
    if (!this._networks.isTrusted(state.ssid)) return null;
    const address = findLanAddress();
    if (!address) return null;
    return {
      url: `https://${address}:${this._config.port}`,
      code: this._pairing.currentCode(),
      ca: this._tls.caPem(),
    };
  }
}

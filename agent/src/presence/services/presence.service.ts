import { Inject, Injectable } from '@nestjs/common';
import type { MacState } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { PairingService } from '../../devices/services/pairing.service';
import { findLanAddress } from '../helpers/find-lan-address';

/** Локальна адреса агента для дашборду: лише в довіреній Wi-Fi. */
@Injectable()
export class PresenceService {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _pairing: PairingService,
  ) {}

  /**
   * Адреса агента з одноразовим кодом сполучення у фрагменті. Головний токен з Mac не виходить:
   * сторінка міняє код на власний токен пристрою, а код швидко протухає.
   */
  localUrl(state: MacState): string | null {
    if (!state.trusted) return null;
    const address = findLanAddress();
    return address ? `http://${address}:${this._config.port}/#p=${this._pairing.currentCode()}` : null;
  }
}

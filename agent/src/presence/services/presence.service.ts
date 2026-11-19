import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRESENCE_KEY, PRESENCE_TTL_SECONDS } from '@awake/contracts';
import type { MacState, Presence } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { findLanAddress } from '../helpers/find-lan-address';
import { UpstashClient } from './upstash.client';

/** Без змін стан публікуємо не частіше, ніж раз на цей час, щоб ключ не протух. */
const REFRESH_MS = 15_000;

/**
 * Кладе в Upstash живий стан і, лише в довіреній мережі, локальну адресу агента.
 * Історія і журнал лишаються на Mac.
 */
@Injectable()
export class PresenceService {
  private readonly _logger = new Logger(PresenceService.name);
  private _lastPayload = '';
  private _lastAt = 0;
  private _failing = false;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _upstash: UpstashClient,
  ) {}

  localUrl(state: MacState): string | null {
    if (!state.trusted) return null;
    const address = findLanAddress();
    // Токен у фрагменті: браузер не шле його на сервер, а сторінка агента забирає звідти.
    return address ? `http://${address}:${this._config.port}/#t=${this._config.token}` : null;
  }

  async publish(state: MacState) {
    if (!this._upstash.isConfigured) return;
    const presence: Omit<Presence, 'updatedAt'> = { state, localUrl: this.localUrl(state) };
    const payload = JSON.stringify(presence);
    const now = Date.now();
    if (payload === this._lastPayload && now - this._lastAt < REFRESH_MS) return;
    try {
      const value: Presence = { ...presence, updatedAt: new Date(now).toISOString() };
      await this._upstash.command(['SET', PRESENCE_KEY, JSON.stringify(value), 'EX', PRESENCE_TTL_SECONDS]);
      this._lastPayload = payload;
      this._lastAt = now;
      if (this._failing) this._logger.log('Upstash publish recovered');
      this._failing = false;
    } catch (error) {
      if (!this._failing) this._logger.warn(`Upstash publish failed: ${(error as Error).message}`);
      this._failing = true;
    }
  }
}

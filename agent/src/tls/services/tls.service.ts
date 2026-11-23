import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:https';
import { join } from 'node:path';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { findLanAddresses } from '../../presence/helpers/find-lan-addresses';
import { TLS_CHECK_INTERVAL_MS } from '../constants/tls.constants';
import { ensureCa } from '../helpers/ensure-ca';
import { ensureTls } from '../helpers/ensure-tls';
import type { TlsMaterial } from '../types/tls.types';

/**
 * Локальний HTTPS агента: CA, якому Web UI довіряє один раз, і серверний сертифікат під LAN-адреси Mac.
 * Адреси Wi-Fi змінюються, тож раз на 30 с перевіряємо їх і міняємо сертифікат без рестарту.
 */
@Injectable()
export class TlsService implements OnModuleDestroy {
  private readonly _logger = new Logger(TlsService.name);
  private readonly _caPem: string;
  private _leaf: TlsMaterial;
  private readonly _timer: NodeJS.Timeout;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _adapters: HttpAdapterHost,
  ) {
    ensureCa(this._config.tlsDir);
    this._caPem = readFileSync(join(this._config.tlsDir, 'ca.crt'), 'utf8');
    this._leaf = ensureTls(this._config.tlsDir, findLanAddresses());
    this._timer = setInterval(() => this._refresh(), TLS_CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this._timer);
  }

  /** PEM нашого CA: Web UI зберігає його і довіряє один раз. */
  caPem(): string {
    return this._caPem;
  }

  currentContext(): { key: Buffer; cert: Buffer } {
    return { key: this._leaf.key, cert: this._leaf.cert };
  }

  private _refresh() {
    try {
      const next = ensureTls(this._config.tlsDir, findLanAddresses());
      if (next.cert.equals(this._leaf.cert)) return;
      (this._adapters.httpAdapter.getHttpServer() as Server).setSecureContext({ key: next.key, cert: next.cert });
      this._leaf = next;
      this._logger.log(`TLS certificate renewed for ${next.addresses.join(', ') || 'loopback only'}`);
    } catch (error) {
      this._logger.warn(`TLS refresh failed: ${(error as Error).message}`);
    }
  }
}

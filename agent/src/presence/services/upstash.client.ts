import { Inject, Injectable } from '@nestjs/common';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { AppSecretsService } from '../../secrets';

/** Мінімальний клієнт Upstash Redis REST: одна команда на запит, без SDK. */
@Injectable()
export class UpstashClient {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _secrets: AppSecretsService,
  ) {}

  /** Ключі з секретів аппки (env, Envify, secrets.env); зміна формою діє без перезапуску. */
  private get _url(): string | null {
    return this._secrets.get('upstashUrl') ?? this._config.upstashUrl;
  }

  private get _token(): string | null {
    return this._secrets.get('upstashToken') ?? this._config.upstashToken;
  }

  get isConfigured(): boolean {
    return !!(this._url && this._token);
  }

  async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this._url!, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this._token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
    return ((await res.json()) as { result: unknown }).result;
  }
}

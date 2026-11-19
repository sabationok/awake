import { Inject, Injectable } from '@nestjs/common';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';

/** Мінімальний клієнт Upstash Redis REST: одна команда на запит, без SDK. */
@Injectable()
export class UpstashClient {
  constructor(@Inject(AGENT_CONFIG) private readonly _config: AgentConfig) {}

  get isConfigured(): boolean {
    return !!(this._config.upstashUrl && this._config.upstashToken);
  }

  async command(args: (string | number)[]): Promise<unknown> {
    const res = await fetch(this._config.upstashUrl!, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this._config.upstashToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
    return ((await res.json()) as { result: unknown }).result;
  }
}

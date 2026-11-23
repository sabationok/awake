import { Inject, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';

/** Головний токен агента (Mac-аппка, розробка): порівняння за сталий час. */
@Injectable()
export class AgentToken {
  private readonly _token: Buffer;

  constructor(@Inject(AGENT_CONFIG) config: AgentConfig) {
    this._token = Buffer.from(config.token);
  }

  matches(token: string): boolean {
    const given = Buffer.from(token);
    return given.length === this._token.length && timingSafeEqual(given, this._token);
  }
}

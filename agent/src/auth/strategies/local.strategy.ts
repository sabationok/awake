import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { API_ERROR_CODES, AppException } from '../../common/app-exception';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { PairingService } from '../../devices/services/pairing.service';
import { TrustedNetworksService } from '../../trusted-networks';
import { requestPath } from '../helpers/request-path';
import type { Principal } from '../types/principal.types';
import { AgentToken } from './agent-token';
import { readBearer, type AuthStrategy } from './auth-strategy.types';

/**
 * Цей Mac і LAN на основних портах. LAN — лише поки Mac у довіреній Wi-Fi. Bearer: головний токен агента
 * або токен пристрою, сполученого локально. Кукі тут не діють: LAN іде звичайним http, Secure-кука не ставиться.
 * Тунель (ngrok тощо) сюди не підключати: він прийшов би як loopback з правами Mac-аппки.
 */
@Injectable()
export class LocalStrategy implements AuthStrategy {
  readonly id = 'local' as const;
  readonly usesCookies = false;
  private readonly _tailnetPort: number;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _agentToken: AgentToken,
    private readonly _networks: TrustedNetworksService,
    private readonly _pairing: PairingService,
  ) {
    this._tailnetPort = config.tailnetPort;
  }

  matches(req: Request): boolean {
    return requestPath(req, this._tailnetPort).type !== 'tailnet';
  }

  authenticate(req: Request): Principal | null {
    if (requestPath(req, this._tailnetPort).type === 'lan' && !this._networks.isCurrentTrusted) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Mac is not on a trusted network', HttpStatus.FORBIDDEN);
    }
    const token = readBearer(req);
    if (!token) return null;
    if (this._agentToken.matches(token)) return { kind: 'agent' };
    const deviceId = this._pairing.findDeviceId(token, 'local');
    return deviceId === null ? null : { kind: 'device', deviceId };
  }
}

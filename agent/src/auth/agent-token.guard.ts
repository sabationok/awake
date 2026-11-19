import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Кожен запит до API: правильний токен агента, а запит не з цього Mac
 * приймаємо лише поки Mac у довіреній мережі Wi-Fi.
 */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  private readonly _token: Buffer;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _bridge: MacBridgeService,
  ) {
    this._token = Buffer.from(config.token);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
    if (given.length !== this._token.length || !timingSafeEqual(given, this._token)) {
      throw new AppException(API_ERROR_CODES.unauthorized, 'Invalid agent token', HttpStatus.UNAUTHORIZED);
    }
    const remote = req.socket.remoteAddress ?? '';
    if (!LOOPBACK.has(remote) && !this._bridge.state?.trusted) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Mac is not on a trusted network', HttpStatus.FORBIDDEN);
    }
    return true;
  }
}

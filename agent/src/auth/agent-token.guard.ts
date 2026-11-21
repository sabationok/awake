import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { BOT_CONTEXT_TYPE } from '../bot';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PairingService } from '../devices/services/pairing.service';
import { TrustedNetworksService } from '../trusted-networks';
import { PUBLIC_ROUTE } from './decorators/public-route.decorator';

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Запит не з цього Mac приймаємо лише поки Mac у довіреній мережі Wi-Fi.
 * Далі потрібен головний токен агента (Mac-аппка, розробка) або токен сполученого пристрою.
 */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  private readonly _token: Buffer;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _networks: TrustedNetworksService,
    private readonly _pairing: PairingService,
    private readonly _reflector: Reflector,
  ) {
    this._token = Buffer.from(config.token);
  }

  canActivate(context: ExecutionContext): boolean {
    // Дії `@Bot` вже пройшли перевірку свого транспорту: HTTP — цей guard, Telegram — чат власника, Mac — stdin.
    if (context.getType<string>() === BOT_CONTEXT_TYPE) return true;
    // Інші типи (ws, rpc) тут ще не мають своєї перевірки: закрито, доки її не додадуть.
    if (context.getType() !== 'http') return false;
    const req = context.switchToHttp().getRequest<Request>();
    const remote = req.socket.remoteAddress ?? '';
    if (!LOOPBACK.has(remote) && !this._networks.isCurrentTrusted) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Mac is not on a trusted network', HttpStatus.FORBIDDEN);
    }
    if (this._reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (this._isAgentToken(token) || (token && this._pairing.isDeviceToken(token))) return true;
    throw new AppException(API_ERROR_CODES.unauthorized, 'Invalid token', HttpStatus.UNAUTHORIZED);
  }

  private _isAgentToken(token: string): boolean {
    const given = Buffer.from(token);
    return given.length === this._token.length && timingSafeEqual(given, this._token);
  }
}

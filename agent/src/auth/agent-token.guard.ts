import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { BOT_CONTEXT_TYPE } from '../bot';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PairingService } from '../devices/services/pairing.service';
import { TailscaleService } from '../tailscale';
import { TrustedNetworksService } from '../trusted-networks';
import { PUBLIC_ROUTE } from './decorators/public-route.decorator';
import { requestPath } from './helpers/request-path';

/**
 * LAN — лише поки Mac у довіреній Wi-Fi; tailnet — лише поки serve ввімкнено і лише від власника tailnet.
 * Далі потрібен головний токен агента (Mac-аппка, розробка) або токен пристрою, сполученого саме цим шляхом.
 */
@Injectable()
export class AgentTokenGuard implements CanActivate {
  private readonly _token: Buffer;
  private readonly _tailnetPort: number;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _networks: TrustedNetworksService,
    private readonly _pairing: PairingService,
    private readonly _tailscale: TailscaleService,
    private readonly _reflector: Reflector,
  ) {
    this._token = Buffer.from(config.token);
    this._tailnetPort = config.tailnetPort;
  }

  canActivate(context: ExecutionContext): boolean {
    // Дії `@Bot` вже пройшли перевірку свого транспорту: HTTP — цей guard, Telegram — чат власника, Mac — stdin.
    if (context.getType<string>() === BOT_CONTEXT_TYPE) return true;
    // Інші типи (ws, rpc) тут ще не мають своєї перевірки: закрито, доки її не додадуть.
    if (context.getType() !== 'http') return false;
    const req = context.switchToHttp().getRequest<Request>();
    const path = requestPath(req, this._tailnetPort);
    if (path.type === 'lan' && !this._networks.isCurrentTrusted) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Mac is not on a trusted network', HttpStatus.FORBIDDEN);
    }
    if (path.type === 'tailnet' && !(this._tailscale.isServing && this._tailscale.isOwner(path.login))) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Not the owner of this tailnet', HttpStatus.FORBIDDEN);
    }
    if (this._reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()])) return true;

    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (this._isAgentToken(token) || (token && this._pairing.isDeviceToken(token, path.type === 'tailnet' ? 'tailnet' : 'local'))) return true;
    throw new AppException(API_ERROR_CODES.unauthorized, 'Invalid token', HttpStatus.UNAUTHORIZED);
  }

  private _isAgentToken(token: string): boolean {
    const given = Buffer.from(token);
    return given.length === this._token.length && timingSafeEqual(given, this._token);
  }
}

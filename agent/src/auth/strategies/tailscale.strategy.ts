import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { RELAY_DEVICE_COOKIE, WEB_SESSION_COOKIE } from '@macontrol/contracts';
import { API_ERROR_CODES, AppException } from '../../common/app-exception';
import { readCookie } from '../../common/read-cookie';
import { AGENT_CONFIG, AgentConfig } from '../../config/agent-config';
import { PairingService } from '../../devices/services/pairing.service';
import { TailscaleService } from '../../tailscale';
import { WebSessionsService } from '../../web-auth/services/web-sessions.service';
import { requestPath } from '../helpers/request-path';
import type { Principal } from '../types/principal.types';
import { AgentToken } from './agent-token';
import { readBearer, type AuthStrategy } from './auth-strategy.types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * `https://<mac>.ts.net` через `tailscale serve` на окремий loopback-порт. Канал: serve увімкнений і запит від
 * власника tailnet (`Tailscale-User-Login` ставить serve, копії клієнта він вирізає). Далі кукі same-origin:
 * `mc_device` (пристрій, сполучений через tailnet) і `mc_session` (жива сесія). Bearer токен пристрою тут не діє:
 * довіра пристрою сама Web UI не відкриває. Головний токен агента лишається для розробки.
 */
@Injectable()
export class TailscaleStrategy implements AuthStrategy {
  readonly id = 'tailscale' as const;
  readonly usesCookies = true;
  private readonly _tailnetPort: number;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _agentToken: AgentToken,
    private readonly _tailscale: TailscaleService,
    private readonly _pairing: PairingService,
    private readonly _sessions: WebSessionsService,
  ) {
    this._tailnetPort = config.tailnetPort;
  }

  matches(req: Request): boolean {
    return requestPath(req, this._tailnetPort).type === 'tailnet';
  }

  authenticate(req: Request): Principal | null {
    const path = requestPath(req, this._tailnetPort);
    const login = path.type === 'tailnet' ? path.login : null;
    if (!(this._tailscale.isServing && this._tailscale.isOwner(login))) {
      throw new AppException(API_ERROR_CODES.untrustedNetwork, 'Not the owner of this tailnet', HttpStatus.FORBIDDEN);
    }
    this._checkOrigin(req);

    const bearer = readBearer(req);
    if (bearer && this._agentToken.matches(bearer)) return { kind: 'agent' };

    const deviceToken = readCookie(req.headers.cookie, RELAY_DEVICE_COOKIE);
    const deviceId = deviceToken ? this._pairing.findDeviceId(deviceToken, 'tailnet') : null;
    if (deviceId === null) return null;
    const sessionToken = readCookie(req.headers.cookie, WEB_SESSION_COOKIE);
    const session = sessionToken ? this._sessions.validate(sessionToken, deviceId) : null;
    return session ? { kind: 'web', deviceId, sessionId: session.id } : { kind: 'web-device', deviceId };
  }

  /** Кукі браузер шле й на запити з чужих сайтів: не-GET приймаємо лише з нашого origin (SameSite=Lax — другий шар). */
  private _checkOrigin(req: Request) {
    const origin = req.headers.origin;
    if (SAFE_METHODS.has(req.method) || !origin) return;
    const dnsName = this._tailscale.state.dnsName;
    if (dnsName && origin === `https://${dnsName}`) return;
    throw new AppException(API_ERROR_CODES.forbiddenOrigin, 'Cross-site request', HttpStatus.FORBIDDEN);
  }
}

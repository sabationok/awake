import { Body, Controller, Get, Headers, HttpStatus, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { DevicePairingPoll } from '@macontrol/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PublicRoute } from '../auth/decorators/public-route.decorator';
import { requestPath } from '../auth/helpers/request-path';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import { DEFAULT_IDLE_MINUTES } from '../web-auth/constants/web-auth';
import { setDeviceCookie, setSessionCookie } from '../web-auth/helpers/web-auth-cookies';
import { WebSessionsService } from '../web-auth/services/web-sessions.service';
import { PairingService } from './services/pairing.service';

/** Без токена, але гард усе одно пускає лише з довіреної мережі або від власника tailnet. */
@Controller('api/devices')
export class DevicesController {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _pairing: PairingService,
    private readonly _sessions: WebSessionsService,
  ) {}

  /** Код з QR міняється на запит, який чекає «Дозволити» на Mac. */
  @PublicRoute()
  @Post('pair')
  pair(@Req() req: Request, @Body() body: { code?: string }, @Headers('user-agent') userAgent?: string): AppResponse<{ requestId: string }> {
    // Код приймається лише тим шляхом, яким прийшов запит: локальний QR не діє через tailnet.
    const via = requestPath(req, this._config.tailnetPort).type === 'tailnet' ? 'tailnet' : 'local';
    const requestId = body?.code ? this._pairing.request(body.code, userAgent ?? null, via) : null;
    if (!requestId) throw new AppException(API_ERROR_CODES.unauthorized, 'Pairing code expired or invalid', HttpStatus.UNAUTHORIZED);
    return AppResponse.ok({ requestId });
  }

  /**
   * Пристрій питає, чи його вже дозволили. id запиту випадковий і відомий лише йому.
   * LAN: токен пристрою в тілі (Bearer). Tailscale: токен не в тілі, а в HttpOnly `mc_device` плюс перша
   * сесія `mc_session`, тож одразу після «Дозволити» Web UI відкривається без пароля.
   */
  @PublicRoute()
  @Get('pair/:requestId')
  poll(@Param('requestId') requestId: string, @Res({ passthrough: true }) res: Response): AppResponse<DevicePairingPoll> {
    const result = this._pairing.poll(requestId);
    if (result.status !== 'approved') return AppResponse.ok({ status: result.status });
    if (result.via !== 'tailnet') return AppResponse.ok({ status: 'approved', token: result.token });
    setDeviceCookie(res, result.token);
    setSessionCookie(res, this._sessions.create(result.deviceId, DEFAULT_IDLE_MINUTES).token);
    return AppResponse.ok({ status: 'approved' });
  }
}

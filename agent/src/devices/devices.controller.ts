import { Body, Controller, Get, Headers, HttpStatus, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { DevicePairingPoll } from '@awake/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PublicRoute } from '../auth/decorators/public-route.decorator';
import { requestPath } from '../auth/helpers/request-path';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import { PairingService } from './services/pairing.service';

/** Без токена, але гард усе одно пускає лише з довіреної мережі або від власника tailnet. */
@Controller('api/devices')
export class DevicesController {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _pairing: PairingService,
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

  /** Пристрій питає, чи його вже дозволили. id запиту випадковий і відомий лише йому. */
  @PublicRoute()
  @Get('pair/:requestId')
  poll(@Param('requestId') requestId: string): AppResponse<DevicePairingPoll> {
    return AppResponse.ok(this._pairing.poll(requestId));
  }
}

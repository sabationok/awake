import { Body, Controller, Get, Headers, HttpStatus, Param, Post } from '@nestjs/common';
import type { DevicePairingPoll } from '@awake/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PublicRoute } from '../auth/decorators/public-route.decorator';
import { PairingService } from './services/pairing.service';

/** Без токена, але гард усе одно пускає лише з довіреної мережі. */
@Controller('api/devices')
export class DevicesController {
  constructor(private readonly _pairing: PairingService) {}

  /** Код з QR міняється на запит, який чекає «Дозволити» на Mac. */
  @PublicRoute()
  @Post('pair')
  pair(@Body() body: { code?: string }, @Headers('user-agent') userAgent?: string): AppResponse<{ requestId: string }> {
    const requestId = body?.code ? this._pairing.request(body.code, userAgent ?? null) : null;
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

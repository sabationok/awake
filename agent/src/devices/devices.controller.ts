import { Body, Controller, Headers, HttpStatus, Post } from '@nestjs/common';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { PublicRoute } from '../auth/decorators/public-route.decorator';
import { PairingService } from './services/pairing.service';

@Controller('api/devices')
export class DevicesController {
  constructor(private readonly _pairing: PairingService) {}

  /** Без токена, але гард усе одно пускає лише з довіреної мережі. */
  @PublicRoute()
  @Post('pair')
  pair(@Body() body: { code?: string }, @Headers('user-agent') userAgent?: string): AppResponse<{ token: string }> {
    const token = body?.code ? this._pairing.pair(body.code, userAgent ?? null) : null;
    if (!token) throw new AppException(API_ERROR_CODES.unauthorized, 'Pairing code expired or invalid', HttpStatus.UNAUTHORIZED);
    return AppResponse.ok({ token });
  }
}

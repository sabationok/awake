import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { WEB_SESSION_IDLE_OPTIONS, type WebLoginBody, type WebSessionIdleMinutes, type WebSessionInfo } from '@macontrol/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { CurrentAuth } from '../auth/decorators/current-auth.decorator';
import { Principals } from '../auth/decorators/principals.decorator';
import type { AuthContext } from '../auth/types/principal.types';
import { clearSessionCookie, setSessionCookie } from './helpers/web-auth-cookies';
import { DashboardPasswordService } from './services/dashboard-password.service';
import { WebSessionsService } from './services/web-sessions.service';

const NO_SESSION: WebSessionInfo = { idleMinutes: null, expiresAt: null };

/** Вхід у Web UI. Сесію і її продовження на кожному запиті веде стратегія guard-а; тут — створення і вихід. */
@Controller('api/auth')
export class WebAuthController {
  constructor(
    private readonly _password: DashboardPasswordService,
    private readonly _sessions: WebSessionsService,
  ) {}

  /** Лише сполучений пристрій (`mc_device`). Стара сесія, якщо була, відкликається. */
  @Principals('web-device', 'web')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@CurrentAuth() auth: AuthContext, @Body() body: Partial<WebLoginBody>, @Res({ passthrough: true }) res: Response): AppResponse<WebSessionInfo> {
    const principal = auth.principal;
    if (principal?.kind !== 'web' && principal?.kind !== 'web-device') throw new AppException(API_ERROR_CODES.unauthorized, 'Not a paired device', HttpStatus.FORBIDDEN);
    const idleMinutes = WEB_SESSION_IDLE_OPTIONS.find((option) => option === body?.idleMinutes);
    if (typeof body?.password !== 'string' || !idleMinutes) throw new AppException(API_ERROR_CODES.invalidCommand, 'password and idleMinutes (2, 5, 10) are required');
    this._password.verify(principal.deviceId, body.password);
    if (principal.kind === 'web') this._sessions.revoke(principal.sessionId);
    const { token, session } = this._sessions.create(principal.deviceId, idleMinutes as WebSessionIdleMinutes);
    setSessionCookie(res, token);
    return AppResponse.ok(WebSessionsService.info(session));
  }

  /** Shell gate перед рендером. Guard уже продовжив сесію; для agent / device (Bearer) сесії немає. */
  @Get('session')
  session(@CurrentAuth() auth: AuthContext): AppResponse<WebSessionInfo> {
    return AppResponse.ok(this._info(auth));
  }

  /** Активність у вкладці (≤ 1/хв): продовження робить guard, як і на будь-якому роуті. */
  @Post('touch')
  @HttpCode(HttpStatus.OK)
  touch(@CurrentAuth() auth: AuthContext): AppResponse<WebSessionInfo> {
    return AppResponse.ok(this._info(auth));
  }

  /** Вихід: сесія відкликається, `mc_session` чиститься, `mc_device` лишається. */
  @Principals('web', 'web-device')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) res: Response): AppResponse<null> {
    if (auth.principal?.kind === 'web') this._sessions.revoke(auth.principal.sessionId);
    clearSessionCookie(res);
    return AppResponse.ok(null);
  }

  private _info(auth: AuthContext): WebSessionInfo {
    const principal = auth.principal;
    if (principal?.kind !== 'web') return NO_SESSION;
    // validate у guard-і щойно продовжив сесію: строк — від цього запиту.
    return this._sessions.info(principal.sessionId) ?? NO_SESSION;
  }
}

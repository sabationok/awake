import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BOT_CONTEXT_TYPE } from '../bot';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { DEFAULT_PRINCIPALS, PRINCIPALS } from './decorators/principals.decorator';
import { PUBLIC_ROUTE } from './decorators/public-route.decorator';
import { LocalStrategy } from './strategies/local.strategy';
import { TailscaleStrategy } from './strategies/tailscale.strategy';
import type { AuthStrategy } from './strategies/auth-strategy.types';
import type { AuthedRequest, PrincipalKind } from './types/principal.types';

/**
 * Один guard на всі роути. Реєстр стратегій: перша, що впізнала канал, перевіряє його і каже, хто прийшов.
 * Роут каже, кому він відкритий (`@Principals`, `@PublicRoute`). Канал роуту не важливий.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly _strategies: AuthStrategy[];

  constructor(
    tailscale: TailscaleStrategy,
    local: LocalStrategy,
    private readonly _reflector: Reflector,
  ) {
    // Порядок важливий: local бере все, що не впізнали інші.
    this._strategies = [tailscale, local];
  }

  canActivate(context: ExecutionContext): boolean {
    // Дії `@Bot` вже пройшли перевірку свого транспорту: HTTP — цей guard, Telegram — чат власника, Mac — stdin.
    if (context.getType<string>() === BOT_CONTEXT_TYPE) return true;
    // Інші типи (ws, rpc) тут ще не мають своєї перевірки: закрито, доки її не додадуть.
    if (context.getType() !== 'http') return false;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const strategy = this._strategies.find((candidate) => candidate.matches(req));
    if (!strategy) return false;
    const principal = strategy.authenticate(req);
    req.auth = { strategy: strategy.id, principal };

    const targets = [context.getHandler(), context.getClass()];
    if (this._reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true;
    const allowed = this._reflector.getAllAndOverride<PrincipalKind[]>(PRINCIPALS, targets) ?? DEFAULT_PRINCIPALS;
    if (principal && allowed.includes(principal.kind)) return true;

    if (strategy.usesCookies && (!principal || principal.kind === 'web-device')) {
      // Пристрій уже сполучений → вхід паролем; ще ні → сканувати QR на Mac.
      const next = principal ? ({ type: 'auth', action: 'login' } as const) : ({ type: 'pair', action: 'scan' } as const);
      throw new AppException(API_ERROR_CODES.authRequired, 'Sign in required', HttpStatus.UNAUTHORIZED, next);
    }
    if (principal) throw new AppException(API_ERROR_CODES.unauthorized, 'Not allowed for this client', HttpStatus.FORBIDDEN);
    throw new AppException(API_ERROR_CODES.unauthorized, 'Invalid token', HttpStatus.UNAUTHORIZED);
  }
}

import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { LiveMessage } from '@macontrol/contracts';
import { AppResponse } from '../common/app-response';
import { sendCached } from '../modules/helpers/send-cached';
import { AppStateService } from './services/app-state.service';
import { UiNotifyService } from './services/ui-notify.service';

/** Web UI агента (LAN, Tailscale) бачить scope local, як і його сторінки. */
const SCOPE = 'local';
/** Порожній рядок раз на стільки: проксі (Tailscale serve) не закриває тихе з'єднання. */
const KEEPALIVE_MS = 25_000;

@Controller('api/ui')
export class AppStateController {
  constructor(
    private readonly _state: AppStateService,
    private readonly _notify: UiNotifyService,
  ) {}

  /** Повний AppState (scope local) з ETag `"local:state:<rev>"`. */
  @Get('state')
  getState(@Req() req: Request, @Res() res: Response) {
    const full = this._state.full(SCOPE);
    sendCached(req, res, `${SCOPE}:state:${full.rev}`, AppResponse.ok(full));
  }

  /**
   * Живий канал Web UI: NDJSON, по рядку `LiveMessage`. Першим — `state.full`, далі `state.patch` з `rev` +1 і
   * `notify`. Пропуск `rev` на клієнті — він перепідключається і знову отримує повний стейт.
   */
  @Get('live')
  live(@Req() req: Request, @Res() res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const write = (message: LiveMessage) => res.write(`${JSON.stringify(message)}\n`);
    write({ type: 'state.full', ...this._state.full(SCOPE) });
    const subscriptions = [
      this._state.patches$.subscribe((patch) => write({ type: 'state.patch', ...this._state.patchFor(patch, SCOPE) })),
      this._notify.notify$.subscribe((notify) => write({ type: 'notify', notify })),
    ];
    const keepalive = setInterval(() => res.write('\n'), KEEPALIVE_MS);
    req.on('close', () => {
      clearInterval(keepalive);
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    });
  }
}

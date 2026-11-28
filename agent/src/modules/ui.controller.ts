import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { requestPath } from '../auth/helpers/request-path';
import { TAILSCALE_PROXY_ID } from '../tailscale';
import { AppResponse } from '../common/app-response';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import { TransportsService } from '../transports';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { isUiEvent } from './helpers/is-ui-event';
import { sendCached } from './helpers/send-cached';
import { ModulesService } from './modules.service';

/** Web UI агента (LAN, Tailscale) бачить scope local; mac — лише Mac-аппка через server.sock. */
const UI_SCOPE = 'local';

@Controller('api/ui')
export class UiController {
  constructor(
    private readonly _modules: ModulesService,
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    transports: TransportsService,
  ) {
    // HTTP-сервер агента: Web UI у домашній мережі (LAN). Поки агент живий — він слухає.
    transports.register({
      id: 'web',
      title: 'Веб',
      icon: { symbol: 'network', tone: 'accent' },
      status: () => ({ online: true, hint: `https, порт ${_config.port}` }),
    });
  }

  /** Індекс роутів Web UI (scope local). ETag `"local:<rev>"`: той самий — `304` без тіла. */
  @Get('shell')
  async getShell(@Req() req: Request, @Res() res: Response) {
    const shell = await this._modules.buildShell(UI_SCOPE);
    sendCached(req, res, `${UI_SCOPE}:${shell.rev}`, AppResponse.ok(shell));
  }

  /** Одна сторінка таблицею вузлів (scope local), з тим самим ETag / `304`. */
  @Get('pages/:pageId')
  async getPage(@Param('pageId') pageId: string, @Req() req: Request, @Res() res: Response) {
    const page = await this._modules.buildPage(pageId, UI_SCOPE);
    if (!page) throw new AppException(API_ERROR_CODES.pageNotFound, `Unknown page ${pageId}`, HttpStatus.NOT_FOUND);
    sendCached(req, res, `${UI_SCOPE}:${page.rev}`, AppResponse.ok(page));
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  async dispatch(@Req() req: Request, @Body() body: unknown): Promise<AppResponse<{ accepted: boolean }>> {
    if (!isUiEvent(body)) throw new AppException(API_ERROR_CODES.invalidCommand, 'Invalid UI event');
    // З tailnet — той самий веб, але через проксі http:tailscale: журнал і статистика бачать шлях.
    const tailnet = requestPath(req, this._config.tailnetPort).type === 'tailnet';
    await this._modules.dispatch(body, 'web', tailnet ? { proxy: TAILSCALE_PROXY_ID } : {});
    return AppResponse.ok({ accepted: true });
  }
}

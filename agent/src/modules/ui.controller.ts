import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { requestPath } from '../auth/helpers/request-path';
import { TAILSCALE_PROXY_ID } from '../tailscale';
import type { UiTree } from '@awake/contracts';
import { AppResponse } from '../common/app-response';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import { TransportsService } from '../transports';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { isUiEvent } from './helpers/is-ui-event';
import { ModulesService } from './modules.service';

@Controller('api/ui')
export class UiController {
  constructor(
    private readonly _modules: ModulesService,
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    transports: TransportsService,
  ) {
    // HTTP-сервер агента: дашборд у домашній мережі (LAN). Поки агент живий — він слухає.
    transports.register({
      id: 'web',
      title: 'Веб',
      icon: { symbol: 'network', tone: 'accent' },
      status: () => ({ online: true, hint: `https, порт ${_config.port}` }),
    });
  }

  @Get()
  async getTree(@Query('scope') scope?: string): Promise<AppResponse<UiTree>> {
    if (scope !== undefined && scope !== 'local' && scope !== 'all') {
      throw new AppException(API_ERROR_CODES.invalidCommand, 'scope must be local or all');
    }
    return AppResponse.ok(await this._modules.buildTree(scope === 'all' ? 'all' : 'local'));
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

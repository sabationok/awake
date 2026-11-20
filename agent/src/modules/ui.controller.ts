import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { UiTree } from '@awake/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { isUiEvent } from './helpers/is-ui-event';
import { ModulesService } from './modules.service';

@Controller('api/ui')
export class UiController {
  constructor(private readonly _modules: ModulesService) {}

  @Get()
  async getTree(@Query('scope') scope?: string): Promise<AppResponse<UiTree>> {
    if (scope !== undefined && scope !== 'local' && scope !== 'all') {
      throw new AppException(API_ERROR_CODES.invalidCommand, 'scope must be local or all');
    }
    return AppResponse.ok(await this._modules.buildTree(scope === 'all' ? 'all' : 'local'));
  }

  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  async dispatch(@Body() body: unknown): Promise<AppResponse<{ accepted: boolean }>> {
    if (!isUiEvent(body)) throw new AppException(API_ERROR_CODES.invalidCommand, 'Invalid UI event');
    await this._modules.dispatch(body, 'web');
    return AppResponse.ok({ accepted: true });
  }
}

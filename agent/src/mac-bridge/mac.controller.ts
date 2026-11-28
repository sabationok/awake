import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { CommandAction, CommandRequest, MacState } from '@macontrol/contracts';
import { AppResponse } from '../common/app-response';
import { API_ERROR_CODES, AppException } from '../common/app-exception';
import { MacBridgeService } from './services/mac-bridge.service';

const ACTIONS: readonly CommandAction[] = ['start', 'stop', 'lock', 'displayOff'];
const DURATION = /^\d{1,3}[mhd]$/;

@Controller('api')
export class MacController {
  constructor(private readonly _bridge: MacBridgeService) {}

  @Get('state')
  getState(): AppResponse<MacState | null> {
    return AppResponse.ok(this._bridge.state);
  }

  @Post('commands')
  @HttpCode(HttpStatus.ACCEPTED)
  createCommand(@Body() body: Partial<CommandRequest>): AppResponse<{ id: string }> {
    if (!body?.action || !ACTIONS.includes(body.action)) {
      throw new AppException(API_ERROR_CODES.invalidCommand, `action must be one of ${ACTIONS.join(', ')}`);
    }
    if (body.duration !== undefined && !DURATION.test(body.duration)) {
      throw new AppException(API_ERROR_CODES.invalidCommand, 'duration must look like 30m, 2h or 1d');
    }
    if (!this._bridge.state) {
      throw new AppException(API_ERROR_CODES.macOffline, 'Mac app is not sending state', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const id = this._bridge.sendCommand({ action: body.action, duration: body.duration }, 'web');
    return AppResponse.ok({ id });
  }
}

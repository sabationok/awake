import { Controller, Get, Query } from '@nestjs/common';
import type { LogRecord } from '@macontrol/contracts';
import { AppResponse } from '../common/app-response';
import { clampLimit } from '../common/clamp-limit';
import { LogsService } from './logs.service';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly _logs: LogsService) {}

  @Get()
  findMany(@Query('limit') limit?: string): AppResponse<LogRecord[]> {
    return AppResponse.ok(this._logs.findMany({ pagination: { limit: clampLimit(limit, 100) } }));
  }
}

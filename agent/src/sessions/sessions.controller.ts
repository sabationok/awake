import { Controller, Get, Query } from '@nestjs/common';
import type { SessionRecord } from '@awake/contracts';
import { AppResponse } from '../common/app-response';
import { clampLimit } from '../common/clamp-limit';
import { SessionsService } from './sessions.service';

@Controller('api/sessions')
export class SessionsController {
  constructor(private readonly _sessions: SessionsService) {}

  @Get()
  findMany(@Query('limit') limit?: string): AppResponse<SessionRecord[]> {
    return AppResponse.ok(this._sessions.findMany({ limit: clampLimit(limit, 50) }));
  }
}

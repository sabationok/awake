import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { StatGranularity } from '@awake/contracts';
import { requestPath } from '../../auth/helpers/request-path';
import { AGENT_CONFIG, type AgentConfig } from '../../config/agent-config';
import { StatsService } from '../../stats';
import { SERVER_REQUESTS_STAT_NS } from '../constants/server-stats';

/** Рахує кожен запит до /api за шляхом і класом відповіді, коли відповідь уже пішла (успіх, помилка гарда, 500 — однаково). */
@Injectable()
export class RequestStatsMiddleware implements NestMiddleware {
  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _stats: StatsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (req.originalUrl.startsWith('/api/')) {
      const path = requestPath(req, this._config.tailnetPort).type;
      res.on('finish', () => {
        this._stats.increment({
          namespace: SERVER_REQUESTS_STAT_NS,
          granularities: [StatGranularity.MINUTE, StatGranularity.HOUR, StatGranularity.DAY],
          metrics: { [path]: { [`${Math.floor(res.statusCode / 100)}xx`]: 1 } },
        });
      });
    }
    next();
  }
}

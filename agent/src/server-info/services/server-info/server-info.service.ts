import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { loadavg } from 'node:os';
import { StatGranularity, type ServerInfo, type ServerStats, type ServerUsage } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { flattenStatTotals, StatsService } from '../../../stats';
import { SERVER_REQUESTS_STAT_NS, SERVER_STARTS_STAT_NS } from '../../constants/server-stats';
import { readWebInfo } from '../../helpers/read-web-info';

/** Як часто слати знімок: навантаження і нова публікація вебу змінюються без подій. */
const SERVER_INFO_INTERVAL_MS = 10_000;

/** Сторінка «Сервер» у Mac-аппці: стан самого процесу агента, окремо від його бізнес-логіки. */
@Injectable()
export class ServerInfoService implements OnModuleInit, OnModuleDestroy {
  private readonly _startedAt = new Date().toISOString();
  private _timer?: NodeJS.Timeout;
  /** Точка відліку CPU: споживання рахуємо між знімками. */
  private _cpu = { usage: process.cpuUsage(), at: process.hrtime.bigint() };

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _bridge: MacBridgeService,
    private readonly _stats: StatsService,
  ) {}

  onModuleInit() {
    this._stats.increment({
      namespace: SERVER_STARTS_STAT_NS,
      granularities: [StatGranularity.DAY, StatGranularity.MONTH],
      metrics: { start: { count: 1 } },
    });
    this._push();
    this._timer = setInterval(() => this._push(), SERVER_INFO_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this._timer);
  }

  snapshot(): ServerInfo {
    const { port, httpPort, tailnetPort, stage, webPublishedDir, webDir } = this._config;
    return {
      pid: process.pid,
      node: process.version,
      stage,
      startedAt: this._startedAt,
      usage: this._usage(),
      ports: { https: port, http: httpPort, tailnet: tailnetPort },
      web: readWebInfo(webPublishedDir, webDir),
      stats: this._serverStats(),
    };
  }

  /** Запити за шляхом і класом відповіді, старти: сьогодні (UTC) / за весь час. */
  private _serverStats(): ServerStats {
    const starts = flattenStatTotals(this._stats.totals({ namespace: SERVER_STARTS_STAT_NS }));
    return {
      requests: this._stats.totals({ namespace: SERVER_REQUESTS_STAT_NS }),
      starts: { today: starts.today.start ?? 0, total: starts.total.start ?? 0 },
    };
  }

  private _usage(): ServerUsage {
    const now = process.hrtime.bigint();
    const usage = process.cpuUsage(this._cpu.usage);
    const elapsedUs = Number(now - this._cpu.at) / 1000;
    this._cpu = { usage: process.cpuUsage(), at: now };
    const { rss, heapUsed } = process.memoryUsage();
    const cpu = elapsedUs > 0 ? Math.round(((usage.user + usage.system) / elapsedUs) * 1000) / 10 : 0;
    return { cpu, rss, heapUsed, load: Math.round(loadavg()[0] * 100) / 100 };
  }

  private _push() {
    this._bridge.sendServerInfo(this.snapshot());
  }
}

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { loadavg } from 'node:os';
import type { ServerInfo, ServerUsage } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
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
  ) {}

  onModuleInit() {
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

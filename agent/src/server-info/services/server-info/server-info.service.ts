import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { loadavg } from 'node:os';
import { StatGranularity, type ServerInfo, type ServerStats, type ServerUsage } from '@awake/contracts';
import { AGENT_CONFIG, type AgentConfig } from '../../../config/agent-config';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { flattenStatTotals, StatsService } from '../../../stats';
import { METRICS_TRACKING, METRICS_TRACKING_KEY } from '../../../modules/mac/constants/mac-settings';
import { SettingsService } from '../../../settings/settings.service';
import {
  SERVER_CPU_STAT_NS,
  SERVER_LOAD_STAT_NS,
  SERVER_MEMORY_STAT_NS,
  SERVER_REQUESTS_STAT_NS,
  SERVER_STARTS_STAT_NS,
  SERVER_THERMAL_STAT_NS,
} from '../../constants/server-stats';
import { ServerChartsService } from '../server-charts';
import { readWebInfo } from '../../helpers/read-web-info';

/** Як часто слати знімок і писати заміри: навантаження і нова публікація вебу змінюються без подій. */
const SERVER_INFO_INTERVAL_MS = 10_000;
/** Рівень нагріву для графіка: від норми до критичного. */
const THERMAL_LEVEL = { nominal: 0, fair: 1, serious: 2, critical: 3 } as const;
/** Заміри читають графіки «Година» (хвилини), «Сьогодні» (години), 7 і 30 днів (дні). */
const GAUGE_GRANULARITIES = [StatGranularity.MINUTE, StatGranularity.HOUR, StatGranularity.DAY];

/** Сторінка «Сервер» у Mac-аппці: стан самого процесу агента, окремо від його бізнес-логіки. */
@Injectable()
export class ServerInfoService implements OnModuleInit, OnModuleDestroy {
  private readonly _startedAt = new Date().toISOString();
  private _timer?: NodeJS.Timeout;
  /** Точка відліку CPU: споживання рахуємо між знімками. */
  private _cpu = { usage: process.cpuUsage(), at: process.hrtime.bigint() };
  /** Перший замір CPU рахує сам запуск (сотні %): у статистику він не йде. */
  private _cpuWarm = false;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _bridge: MacBridgeService,
    private readonly _stats: StatsService,
    private readonly _charts: ServerChartsService,
    private readonly _settings: SettingsService,
  ) {}

  onModuleInit() {
    this._stats.increment({
      namespace: SERVER_STARTS_STAT_NS,
      granularities: [StatGranularity.MINUTE, StatGranularity.HOUR, StatGranularity.DAY, StatGranularity.MONTH],
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

  /**
   * Знімок у Mac-аппку щоразу (живі цифри «Сервера»); заміри в stats-рушій — лише коли дозволяє налаштування
   * «Заміри сервера і Mac»: завжди або поки йде сесія Awake чи таймер Sleeper.
   */
  private _push() {
    const snapshot = this.snapshot();
    this._bridge.sendServerInfo(snapshot);
    if (!this._recording()) {
      // Після паузи перший замір CPU рахував би всю паузу: як і після старту, його пропускаємо.
      this._cpuWarm = false;
      return;
    }
    const { cpu, rss, heapUsed, load } = snapshot.usage;
    if (this._cpuWarm) this._stats.recordGauge({ namespace: SERVER_CPU_STAT_NS, granularities: GAUGE_GRANULARITIES, values: { cpu } });
    this._cpuWarm = true;
    this._stats.recordGauge({ namespace: SERVER_MEMORY_STAT_NS, granularities: GAUGE_GRANULARITIES, values: { rss, heap: heapUsed } });
    this._stats.recordGauge({ namespace: SERVER_LOAD_STAT_NS, granularities: GAUGE_GRANULARITIES, values: { load } });
    const thermal = this._bridge.state?.thermal;
    if (thermal) this._stats.recordGauge({ namespace: SERVER_THERMAL_STAT_NS, granularities: GAUGE_GRANULARITIES, values: { level: THERMAL_LEVEL[thermal] } });
    this._charts.tick();
  }

  /** Чи писати заміри зараз: налаштування «Завжди» або йде хоч якась сесія (Awake, Sleeper). */
  private _recording(): boolean {
    if (this._settings.get('system', METRICS_TRACKING_KEY) === METRICS_TRACKING.always) return true;
    const mac = this._bridge.state;
    return mac?.active === true || !!mac?.sleepAt;
  }
}

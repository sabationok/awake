import { Injectable } from '@nestjs/common';
import type { ServerCharts, ServerChartsTick, StatsPeriod, UiChart } from '@awake/contracts';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import {
  counterChartPoints,
  gaugeChartPoints,
  statNextPeriodStart,
  statPeriodStart,
  StatsService,
  statsPeriodWindow,
  type StatsPeriodWindow,
} from '../../../stats';
import {
  SERVER_CPU_STAT_NS,
  SERVER_LOAD_STAT_NS,
  SERVER_THERMAL_STAT_NS,
  SERVER_MEMORY_STAT_NS,
  SERVER_REQUESTS_STAT_NS,
  SERVER_STARTS_STAT_NS,
} from '../../constants/server-stats';

const PATHS = { loopback: 'Цей Mac', lan: 'Wi-Fi', tailnet: 'Tailscale' };
const ERRORS = { '4xx': '4xx', '5xx': '5xx' };

/**
 * Графіки «Сервера» з stats-рушія за вибраний період. Mac-аппка просить період (`serverCharts`), отримує всі графіки,
 * а далі після кожного заміру — лише поточний бакет (`serverChartsTick`), який дописує сама.
 */
@Injectable()
export class ServerChartsService {
  /** Період, який зараз дивиться Mac-аппка; null — сторінку ще не відкривали. */
  private _period: StatsPeriod | null = null;

  constructor(
    private readonly _stats: StatsService,
    private readonly _bridge: MacBridgeService,
  ) {}

  /** Аппка відкрила «Сервер» або змінила період: усе вікно разом. */
  subscribe(period: StatsPeriod, now = new Date()) {
    this._period = period;
    const window = statsPeriodWindow(period, now);
    const data: ServerCharts = { period, from: window.from.toISOString(), to: window.to.toISOString(), charts: this._charts(window) };
    this._bridge.sendServerCharts(data);
  }

  /** Після заміру: поточний бакет кожного графіка, якщо вікно періоду включає «зараз». */
  tick(now = new Date()) {
    if (!this._period) return;
    const window = statsPeriodWindow(this._period, now);
    const current = statPeriodStart(now, window.granularity);
    if (current < window.from || current >= window.to) return;
    const charts = this._charts({ ...window, from: current, to: statNextPeriodStart(current, window.granularity) });
    const data: ServerChartsTick = {
      period: this._period,
      from: window.from.toISOString(),
      points: Object.fromEntries(charts.map((chart) => [chart.id, chart.points])),
    };
    this._bridge.sendServerChartsTick(data);
  }

  private _charts({ granularity, unit, from, to }: StatsPeriodWindow): UiChart[] {
    const timeline = (namespace: string) => this._stats.timeline({ namespace, granularity, from, to });
    const requests = timeline(SERVER_REQUESTS_STAT_NS);
    const memory = timeline(SERVER_MEMORY_STAT_NS);
    return [
      { id: 'cpu', type: 'chart', title: 'CPU', unit, tone: 'orange', format: 'percent', points: gaugeChartPoints(timeline(SERVER_CPU_STAT_NS), 'cpu') },
      { id: 'rss', type: 'chart', title: "Пам'ять", unit, tone: 'orange', format: 'bytes', points: gaugeChartPoints(memory, 'rss') },
      { id: 'heap', type: 'chart', title: 'Купа JS', unit, tone: 'yellow', format: 'bytes', points: gaugeChartPoints(memory, 'heap') },
      { id: 'load', type: 'chart', title: 'Навантаження Mac', unit, tone: 'indigo', format: 'number', points: gaugeChartPoints(timeline(SERVER_LOAD_STAT_NS), 'load') },
      // 0 норма · 1 теплий · 2 гарячий · 3 критичний (ProcessInfo.thermalState); °C без sudo macOS не віддає.
      { id: 'thermal', type: 'chart', title: 'Нагрів Mac (0–3)', unit, tone: 'red', format: 'number', points: gaugeChartPoints(timeline(SERVER_THERMAL_STAT_NS), 'level') },
      {
        id: 'requests',
        type: 'chart',
        title: 'Запити',
        unit,
        tones: { [PATHS.loopback]: 'gray', [PATHS.lan]: 'green', [PATHS.tailnet]: 'accent' },
        format: 'count',
        points: counterChartPoints(requests, 'value', PATHS),
      },
      { id: 'errors', type: 'chart', title: 'Помилки', unit, tones: { '4xx': 'orange', '5xx': 'red' }, format: 'count', points: counterChartPoints(requests, 'status', ERRORS) },
      { id: 'starts', type: 'chart', title: 'Старти', unit, tone: 'gray', format: 'count', points: counterChartPoints(timeline(SERVER_STARTS_STAT_NS), 'value', { start: '' }) },
    ];
  }
}

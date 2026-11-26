import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ChartTick, UiChart } from '@awake/contracts';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { statNextPeriodStart, statPeriodStart, statsPeriodWindow, type StatsChartPeriod } from '../stats';
import type { LiveChartRegistry, LiveChartSpec } from './types/live-chart.types';

/** Як часто слати поточний бакет: так само, як заміри «Сервера». */
const LIVE_CHARTS_TICK_MS = 10_000;

/**
 * Live-тіки графіків SDUI-дерева Mac. Сторінки реєструють графіки, поки дерево збирається (ctx.liveChart); реєстр
 * дерева Mac замінюється після кожного його збирання, тож тут лише графіки, що зараз у Mac. Раз на 10 с — лише
 * поточний бакет кожного графіка, чиє вікно включає «зараз», одним `chartTick` на вікно періоду. Дерево заради цього
 * не перешивається; веб опитує дерево і тіків не отримує.
 */
@Injectable()
export class LiveChartsService implements OnModuleInit, OnModuleDestroy {
  private _registry: LiveChartRegistry = new Map();
  private _timer?: NodeJS.Timeout;

  constructor(private readonly _bridge: MacBridgeService) {}

  onModuleInit() {
    this._timer = setInterval(() => this.tick(), LIVE_CHARTS_TICK_MS);
    this._timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this._timer);
  }

  /** Вузол графіка з точками всього вікна періоду; з `registry` (збирання дерева) він ще й отримує тіки. */
  build({ period, points, ...node }: LiveChartSpec, registry?: LiveChartRegistry, now = new Date()): UiChart {
    const window = statsPeriodWindow(period, now);
    registry?.set(node.id, { period, points, ...node });
    return { ...node, type: 'chart', unit: window.unit, points: points(window) };
  }

  /** Дерево Mac зібрано: тепер тікають лише його графіки. */
  replace(registry: LiveChartRegistry) {
    this._registry = registry;
  }

  tick(now = new Date()) {
    const byPeriod = new Map<StatsChartPeriod, LiveChartSpec[]>();
    for (const spec of this._registry.values()) byPeriod.set(spec.period, [...(byPeriod.get(spec.period) ?? []), spec]);
    for (const [period, specs] of byPeriod) {
      const window = statsPeriodWindow(period, now);
      const current = statPeriodStart(now, window.granularity);
      if (current < window.from || current >= window.to) continue;
      const bucket = { ...window, from: current, to: statNextPeriodStart(current, window.granularity) };
      const data: ChartTick = { from: window.from.toISOString(), points: Object.fromEntries(specs.map((spec) => [spec.id, spec.points(bucket)])) };
      this._bridge.sendChartTick(data);
    }
  }
}

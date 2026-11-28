import { Injectable } from '@nestjs/common';
import type { StatTimeline, UiChartPoint } from '@macontrol/contracts';
import { counterChartPoints, StatsService, sumChartPoints, totalChartPoints, type StatFilter, type StatsPeriodWindow } from '../stats';
import { BOT_CALLS_STAT_NS, BOT_ERRORS_STAT_NS, BOT_LEGACY_STAT_NS, BOT_TRANSPORT_SUBJECT } from './constants/bot-stats';

type SeriesFilter = Pick<StatFilter, 'subjectType' | 'subjectId' | 'seriesKey'>;

/** `{ mac: 'Mac' }` → `{ 'src.mac': 'Mac' }`: ключі старих денних лічильників (bot.legacy). */
function legacyKeys(prefix: string, labels: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(labels).map(([key, label]) => [`${prefix}${key}`, label]));
}

/**
 * Точки графіків викликів бота (bot.calls, bot.errors) за вікно періоду, разом з історією до рушія (bot.legacy):
 * у неї лише денні бакети, тож вона додається до 7 і 30 днів, а в хвилинах і годинах її немає.
 */
@Injectable()
export class BotCallsChartsService {
  constructor(private readonly _stats: StatsService) {}

  /** Усі виклики, одна серія. */
  total(window: StatsPeriodWindow): UiChartPoint[] {
    return sumChartPoints(totalChartPoints(this._timeline(BOT_CALLS_STAT_NS, window)), this.legacy(window, { total: '' }));
  }

  /** Невдалі виклики, одна серія. */
  errors(window: StatsPeriodWindow): UiChartPoint[] {
    return sumChartPoints(totalChartPoints(this._timeline(BOT_ERRORS_STAT_NS, window)), this.legacy(window, { error: '' }));
  }

  /** Серія на джерело (subject `transport`): `labels` — джерело → назва серії. */
  bySource(window: StatsPeriodWindow, labels: Record<string, string>): UiChartPoint[] {
    const sources = Object.entries(labels).map(([source, label]) =>
      totalChartPoints(this._timeline(BOT_CALLS_STAT_NS, window, { subjectType: BOT_TRANSPORT_SUBJECT, subjectId: source }), label),
    );
    return sumChartPoints(...sources, this.legacy(window, legacyKeys('src.', labels)));
  }

  /** Серія на проксі (seriesKey), усі джерела разом: `labels` — id проксі → назва серії. */
  byProxy(window: StatsPeriodWindow, labels: Record<string, string>): UiChartPoint[] {
    const proxies = Object.entries(labels).map(([proxy, label]) => totalChartPoints(this._timeline(BOT_CALLS_STAT_NS, window, { seriesKey: proxy }), label));
    return sumChartPoints(...proxies, this.legacy(window, legacyKeys('proxy.', labels)));
  }

  /** Серія на модуль (value bot.calls): `modules` — namespace-и, що їх показує графік (див. `topModules`). */
  byModule(window: StatsPeriodWindow, modules: string[]): UiChartPoint[] {
    const labels = Object.fromEntries(modules.map((module) => [module, module]));
    return sumChartPoints(counterChartPoints(this._timeline(BOT_CALLS_STAT_NS, window), 'value', labels), this.legacy(window, legacyKeys('ns.', labels)));
  }

  /**
   * Найактивніші модулі вікна (разом з історією), до `limit`. `known` — зареєстровані namespace-и: вони доповнюють
   * список нулями, щоб графік мав серії й без викликів. Ранг фіксується на збиранні сторінки, тож тіки мають ті самі серії.
   */
  topModules(window: StatsPeriodWindow, known: string[], limit: number): string[] {
    const counts = new Map<string, number>(known.map((module) => [module, 0]));
    const add = (module: string, statuses: Record<string, number>) =>
      counts.set(module, (counts.get(module) ?? 0) + Object.values(statuses).reduce((a, b) => a + b, 0));
    for (const [module, statuses] of Object.entries(this._timeline(BOT_CALLS_STAT_NS, window).totals)) add(module, statuses);
    for (const [key, statuses] of Object.entries(this._timeline(BOT_LEGACY_STAT_NS, window).totals)) {
      if (key.startsWith('ns.')) add(key.slice(3), statuses);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([module]) => module);
  }

  /**
   * Старі денні лічильники журналу (bot.legacy, плаский ключ → серія): разом з ключами транспортів (`telegram.notify`),
   * які тоді теж жили в журналі бота.
   */
  legacy(window: StatsPeriodWindow, labels: Record<string, string>): UiChartPoint[] {
    return counterChartPoints(this._timeline(BOT_LEGACY_STAT_NS, window), 'value', labels);
  }

  private _timeline(namespace: string, { granularity, from, to }: StatsPeriodWindow, series: SeriesFilter = {}): StatTimeline {
    return this._stats.timeline({ namespace, granularity, from, to, ...series });
  }
}

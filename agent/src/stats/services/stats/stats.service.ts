import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { STAT_SUBJECT_NONE, StatGranularity, type StatMetrics, type StatSeriesRef, type StatTimeline, type StatTotals } from '@awake/contracts';
import { API_ERROR_CODES, AppException } from '../../../common/app-exception';
import { STAT_DEFAULT_VALUE_LIMIT, STAT_LIMITS, STAT_MAX_TIMELINE_POINTS, STAT_RETENTION_MS } from '../../constants/stat-limits';
import { addStatMetrics } from '../../helpers/add-stat-metrics';
import { normalizeStatKey } from '../../helpers/normalize-stat-key';
import { statBucketKey } from '../../helpers/stat-bucket-key';
import { statNextPeriodStart, statPeriodRange, statPeriodStart } from '../../helpers/stat-period';
import { MetricSnapshotsRepository, type StatCellRow, type StatSeriesCellRow } from '../../repositories/metric-snapshots.repository';
import type { StatBucket, StatDurationIncrement, StatFilter, StatIncrement, StatLocalDay } from '../../types/stat-bucket.types';
import { splitStatSpan } from '../../helpers/split-stat-span';

const ALL_GRANULARITIES = Object.values(StatGranularity);

/**
 * Статистика за скілом nestjs-stats, для одного процесу без Redis: гарячий шлях — дельти в пам'яті по бакетах,
 * flush раз на хвилину (і при зупинці) додає їх у metric_snapshots, timeline — проєкція в SQL з gap-fill у коді.
 */
@Injectable()
export class StatsService {
  private readonly _logger = new Logger(StatsService.name);
  /** Серія змінилась (namespace): аппці новий знімок. */
  readonly changed$ = new Subject<string>();
  /** Ще не записані дельти: ключ бакета → бакет. */
  private _pending = new Map<string, StatBucket>();

  /** Гарячий шлях (правило 1): лише пам'ять. Ніколи не кидає (правило 14). */
  increment(params: StatIncrement) {
    try {
      const series = this._seriesOf(params);
      if (!series) return;
      const delta: StatMetrics = {};
      for (const [rawValue, statuses] of Object.entries(params.metrics)) {
        const value = normalizeStatKey(rawValue, STAT_LIMITS.value);
        if (value === null) continue;
        for (const [rawStatus, count] of Object.entries(statuses)) {
          const status = normalizeStatKey(rawStatus, STAT_LIMITS.status);
          if (status !== null && Number.isFinite(count) && count !== 0) (delta[value] ??= {})[status] = (delta[value]?.[status] ?? 0) + count;
        }
      }
      if (!Object.keys(delta).length) return;
      const at = params.at ?? new Date();
      for (const granularity of params.granularities ?? ALL_GRANULARITIES) {
        const periodStart = statPeriodStart(at, granularity);
        const key = statBucketKey(series, granularity, periodStart);
        const bucket = this._pending.get(key) ?? { ...series, granularity, periodStart, metrics: {} };
        addStatMetrics(bucket.metrics, delta);
        this._pending.set(key, bucket);
      }
      this.changed$.next(series.namespace);
    } catch (error) {
      this._logger.warn(`stats increment dropped: ${(error as Error).message}`);
    }
  }

  /**
   * Тривалість через кілька періодів (сесія з 23:40 до 01:10): шматок на кожен бакет найдрібнішої гранулярності,
   * тож день, тиждень і місяць отримують лише свій час. Найдрібніша — щонайменше година, хвилини тут не потрібні.
   */
  incrementDuration(params: StatDurationIncrement) {
    const granularities = params.granularities ?? ALL_GRANULARITIES.filter((g) => g !== StatGranularity.MINUTE);
    const finest = ALL_GRANULARITIES.find((g) => granularities.includes(g)) ?? StatGranularity.HOUR;
    const { value, status = 'seconds', start, end, ...series } = params;
    for (const piece of splitStatSpan(start, end, finest)) {
      const seconds = Math.round(piece.ms / 1000);
      if (seconds > 0) this.increment({ ...series, granularities, at: piece.at, metrics: { [value]: { [status]: seconds } } });
    }
  }

  /**
   * Останні `days` локальних днів Mac (поточний включно) з годинних бакетів: UTC-дні зсунуті на пояс (правило 17).
   * Серія має писати HOUR.
   */
  localDays(filter: Omit<StatFilter, 'granularity' | 'from' | 'to'>, days: number, now = new Date()): StatLocalDay[] {
    const out: StatLocalDay[] = [];
    for (let i = days - 1; i >= 0; i--) out.push({ start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i), metrics: {} });
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    for (const point of this.timeline({ ...filter, granularity: StatGranularity.HOUR, from: out[0].start, to }).points) {
      const t = new Date(point.periodStart);
      const day = out.find((d) => d.start.getFullYear() === t.getFullYear() && d.start.getMonth() === t.getMonth() && d.start.getDate() === t.getDate());
      if (day) addStatMetrics(day.metrics, point.metrics);
    }
    return out;
  }

  /** Дельти в SQLite. Збій — дельти повертаються в пам'ять до наступної спроби (правило 3). */
  flush(): number {
    if (!this._pending.size) return 0;
    const taken = this._pending;
    this._pending = new Map();
    try {
      this._snapshots.addBatch([...taken.values()], new Date().toISOString());
      return taken.size;
    } catch (error) {
      for (const [key, bucket] of taken) {
        const current = this._pending.get(key);
        if (current) addStatMetrics(bucket.metrics, current.metrics);
        this._pending.set(key, bucket);
      }
      this._logger.warn(`stats flush failed, kept ${taken.size} buckets: ${(error as Error).message}`);
      return 0;
    }
  }

  /** Сьогодні (UTC-день) і за весь час з денних бакетів, разом з ще не записаними дельтами. */
  totals(series: Omit<StatFilter, 'granularity' | 'from' | 'to'>, now = new Date()): StatTotals {
    const from = statPeriodStart(now, StatGranularity.DAY);
    const to = statNextPeriodStart(from, StatGranularity.DAY);
    const filter = { ...series, granularity: StatGranularity.DAY };
    return {
      today: this._sum({ ...filter, from, to }),
      total: this._sum(filter),
    };
  }

  /**
   * Як totals, але з розрізом по серіях: subject і seriesKey лишаються в рядку. Для лічильників, де вимірів більше,
   * ніж value × status (транспорт × проксі × модуль × тип).
   */
  seriesTotals(series: Omit<StatFilter, 'granularity' | 'from' | 'to'>, now = new Date()): { today: StatSeriesCellRow[]; total: StatSeriesCellRow[] } {
    const from = statPeriodStart(now, StatGranularity.DAY);
    const to = statNextPeriodStart(from, StatGranularity.DAY);
    const filter = { ...series, granularity: StatGranularity.DAY };
    return { today: this._seriesCells({ ...filter, from, to }), total: this._seriesCells(filter) };
  }

  /** Правило 10: проєкція з SQL, top-N значень, точка на кожен бакет. */
  timeline(filter: StatFilter & { from: Date; to: Date; limit?: number }): StatTimeline {
    if (filter.subjectId !== undefined && filter.subjectType === undefined) {
      throw new AppException(API_ERROR_CODES.invalidCommand, 'subjectId requires subjectType', HttpStatus.BAD_REQUEST);
    }
    const buckets = statPeriodRange(filter.from, filter.to, filter.granularity, STAT_MAX_TIMELINE_POINTS + 1);
    if (buckets.length > STAT_MAX_TIMELINE_POINTS) {
      throw new AppException(API_ERROR_CODES.invalidCommand, 'Timeline is too long: narrow the range or use a coarser granularity', HttpStatus.BAD_REQUEST);
    }
    const from = buckets[0] ?? filter.from;
    const rows = this._cells({ ...filter, from });
    const totals: StatMetrics = {};
    const byValue = new Map<string, number>();
    const statuses = new Set<string>();
    for (const row of rows) {
      (totals[row.value] ??= {})[row.status] = (totals[row.value]?.[row.status] ?? 0) + row.count;
      byValue.set(row.value, (byValue.get(row.value) ?? 0) + row.count);
      statuses.add(row.status);
    }
    const ranked = [...byValue.entries()].sort((a, b) => b[1] - a[1]).map(([value]) => value);
    const values = ranked.slice(0, filter.limit ?? STAT_DEFAULT_VALUE_LIMIT);
    const kept = new Set(values);
    const byPeriod = new Map<number, StatMetrics>();
    for (const row of rows) {
      if (!kept.has(row.value)) continue;
      const ms = new Date(row.periodStart).getTime();
      const point = byPeriod.get(ms) ?? {};
      (point[row.value] ??= {})[row.status] = (point[row.value]?.[row.status] ?? 0) + row.count;
      byPeriod.set(ms, point);
    }
    return {
      namespace: filter.namespace,
      granularity: filter.granularity,
      from: from.toISOString(),
      to: filter.to.toISOString(),
      values,
      statuses: [...statuses].sort(),
      totals: Object.fromEntries(values.map((value) => [value, totals[value] ?? {}])),
      truncated: ranked.length > values.length,
      points: buckets.map((bucket) => ({ periodStart: bucket.toISOString(), metrics: byPeriod.get(bucket.getTime()) ?? {} })),
    };
  }

  /** Чи є в серії хоч щось (у базі чи ще в пам'яті): для одноразового перенесення історії. */
  hasNamespace(namespace: string): boolean {
    return [...this._pending.values()].some((bucket) => bucket.namespace === namespace) || this._snapshots.hasNamespace(namespace);
  }

  /** Правило 12: старі min / hour геть. */
  prune(now = new Date()) {
    for (const [granularity, ms] of Object.entries(STAT_RETENTION_MS)) {
      this._snapshots.deleteOlderThan(granularity as StatGranularity, new Date(now.getTime() - (ms ?? 0)));
    }
  }

  constructor(private readonly _snapshots: MetricSnapshotsRepository) {}

  private _sum(filter: StatFilter): StatMetrics {
    const metrics: StatMetrics = {};
    for (const row of this._cells(filter)) (metrics[row.value] ??= {})[row.status] = (metrics[row.value]?.[row.status] ?? 0) + row.count;
    return metrics;
  }

  /** Клітинки з SQLite плюс ще не записані дельти тих самих серій. */
  private _cells(filter: StatFilter): StatCellRow[] {
    const rows = this._snapshots.sumCells(filter);
    for (const bucket of this._pending.values()) {
      if (!this._matches(bucket, filter)) continue;
      const periodStart = bucket.periodStart.toISOString();
      for (const [value, statuses] of Object.entries(bucket.metrics)) {
        for (const [status, count] of Object.entries(statuses)) rows.push({ periodStart, value, status, count });
      }
    }
    return rows;
  }

  private _seriesCells(filter: StatFilter): StatSeriesCellRow[] {
    const rows = this._snapshots.sumSeries(filter);
    for (const bucket of this._pending.values()) {
      if (!this._matches(bucket, filter)) continue;
      for (const [value, statuses] of Object.entries(bucket.metrics)) {
        for (const [status, count] of Object.entries(statuses)) {
          const row = rows.find(
            (r) => r.subjectType === bucket.subjectType && r.subjectId === (bucket.subjectId ?? null) && r.seriesKey === bucket.seriesKey && r.value === value && r.status === status,
          );
          if (row) row.count += count;
          else rows.push({ subjectType: bucket.subjectType, subjectId: bucket.subjectId ?? null, seriesKey: bucket.seriesKey, value, status, count });
        }
      }
    }
    return rows;
  }

  private _matches(bucket: StatBucket, filter: StatFilter): boolean {
    if (bucket.namespace !== filter.namespace || bucket.granularity !== filter.granularity) return false;
    if (filter.subjectType !== undefined && bucket.subjectType !== filter.subjectType) return false;
    if (filter.subjectId !== undefined && (bucket.subjectId ?? null) !== (filter.subjectId ?? null)) return false;
    if (filter.seriesKey !== undefined && bucket.seriesKey !== filter.seriesKey) return false;
    const t = bucket.periodStart.getTime();
    if (filter.from && t < filter.from.getTime()) return false;
    if (filter.to && t >= filter.to.getTime()) return false;
    return true;
  }

  private _seriesOf(params: StatIncrement): StatSeriesRef | null {
    const series: StatSeriesRef = {
      namespace: params.namespace,
      subjectType: params.subjectType ?? STAT_SUBJECT_NONE,
      subjectId: params.subjectId ?? null,
      seriesKey: params.seriesKey ?? '',
    };
    const tooLong =
      !series.namespace ||
      series.namespace.length > STAT_LIMITS.namespace ||
      series.subjectType.length > STAT_LIMITS.subjectType ||
      (series.subjectId?.length ?? 0) > STAT_LIMITS.subjectId ||
      series.seriesKey.length > STAT_LIMITS.seriesKey;
    if (tooLong) {
      this._logger.warn(`stats series rejected (empty or too long): ${series.namespace}/${series.subjectType}`);
      return null;
    }
    return series;
  }
}

import { Injectable } from '@nestjs/common';
import type { StatsPeriod, UiChart, UiChartPoint } from '@macontrol/contracts';
import { counterChartPoints, StatsService, statSeriesTones, statsPeriodWindow, type StatsPeriodWindow } from '../../../stats';
import { WEBHOOK_ERROR_EVENTS, WEBHOOK_EVENT_LABELS, WEBHOOK_EVENTS_STAT_NS, WEBHOOK_STAT_SUBJECT } from '../../constants/webhook-stats';
import { webhookStatSeries } from '../../helpers/webhook-stat-series';

/** Графіки подій вебхуків (webhook.events) за вікно періоду: для картки вебхука в аппці і для Webhooxy → Трекінг. */
@Injectable()
export class WebhookChartsService {
  constructor(private readonly _stats: StatsService) {}

  /**
   * Події вебхука за вікно, `labels` — подія → серія. Без вебхука (relay ще не створено) — порожні бакети вікна:
   * серія без subject (`''`) подій вебхуків не має.
   */
  eventPoints(webhookId: number | null, { granularity, from, to }: StatsPeriodWindow, labels: Record<string, string>): UiChartPoint[] {
    const series = webhookId === null ? { namespace: WEBHOOK_EVENTS_STAT_NS, subjectType: WEBHOOK_STAT_SUBJECT, subjectId: '' } : webhookStatSeries(webhookId);
    return counterChartPoints(this._stats.timeline({ ...series, granularity, from, to }), 'value', labels);
  }

  /**
   * Графіки картки за період: події stacked (серія на подію) і помилки окремо. Вебхук, що ще не мав жодної події
   * (envify, разові посилання), графіків не має. Подія без підпису — під своїм ключем.
   */
  cardCharts(webhookId: number, period: StatsPeriod, now = new Date()): UiChart[] {
    const known = Object.keys(this._stats.totals(webhookStatSeries(webhookId), now).total);
    if (known.length === 0) return [];
    const window = statsPeriodWindow(period, now);
    const label = (event: string) => WEBHOOK_EVENT_LABELS[event] ?? event;
    const events = Object.fromEntries(known.filter((event) => !WEBHOOK_ERROR_EVENTS.includes(event)).map((event) => [event, label(event)]));
    const errors = Object.fromEntries(known.filter((event) => WEBHOOK_ERROR_EVENTS.includes(event)).map((event) => [event, label(event)]));
    const charts: UiChart[] = [];
    if (Object.keys(events).length > 0) {
      charts.push({
        id: `webhook-${webhookId}-events`,
        type: 'chart',
        title: 'Події',
        unit: window.unit,
        tones: statSeriesTones(Object.values(events)),
        format: 'count',
        points: this.eventPoints(webhookId, window, events),
      });
    }
    if (Object.keys(errors).length > 0) {
      const single = Object.fromEntries(Object.keys(errors).map((event) => [event, '']));
      charts.push({ id: `webhook-${webhookId}-errors`, type: 'chart', title: 'Помилок', unit: window.unit, tone: 'red', format: 'count', points: this.eventPoints(webhookId, window, single) });
    }
    return charts;
  }
}

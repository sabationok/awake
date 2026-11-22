import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { localDay } from '../../bot-journal/helpers/local-day';
import { MetricsRepository } from '../repositories/metrics.repository';

export interface MetricsTrackOptions {
  /** Чиї лічильники: `webhook:<id>` тощо. */
  scope: string;
  /** +1 за замовчуванням; від'ємне — decr. */
  by?: number;
}

export interface ScopeMetrics {
  today: Record<string, number>;
  total: Record<string, number>;
}

/** Денні лічильники зі scope: усе, що рахують вебхуки, йде сюди через `track`. */
@Injectable()
export class MetricsService {
  /** Змінився scope: аппці новий знімок. */
  readonly changed$ = new Subject<string>();

  constructor(private readonly _repository: MetricsRepository) {}

  track(metric: string, options: MetricsTrackOptions, now = new Date()) {
    this._repository.add(localDay(now), options.scope, metric, options.by ?? 1);
    this.changed$.next(options.scope);
  }

  incr(metric: string, scope: string) {
    this.track(metric, { scope, by: 1 });
  }

  decr(metric: string, scope: string) {
    this.track(metric, { scope, by: -1 });
  }

  get(scope: string, now = new Date()): ScopeMetrics {
    return { today: this._repository.sum({ scope, day: localDay(now) }), total: this._repository.sum({ scope }) };
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, merge, Subscription } from 'rxjs';
import type { StatsPeriod, WebhookInfo } from '@macontrol/contracts';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { StatsService } from '../../../stats';
import { RelayStateService } from '../../../relay/state/relay-state.service';
import type { RelayStatus } from '../../../relay/types/relay-status.types';
import { isValidWebhookInput } from '../../helpers/is-valid-webhook-input';
import { WEBHOOK_EVENTS_STAT_NS } from '../../constants/webhook-stats';
import { WebhookChartsService } from '../webhook-charts';
import { WebhooksService } from './webhooks.service';

const RELAY_STATUS: Record<RelayStatus, WebhookInfo['status']> = {
  off: 'off',
  unconfigured: 'unconfigured',
  connecting: 'connecting',
  online: 'online',
  offline: 'offline',
  evicted: 'offline',
  refused: 'offline',
};

/** Модалка аппки → SQLite; список, події, стан relay чи період графіків змінились → аппці новий знімок вебхуків. */
@Injectable()
export class WebhooksListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();
  /** Період графіків карток, який вибрала аппка; до її запиту — «Сьогодні». */
  private _period: StatsPeriod = 'today';

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _webhooks: WebhooksService,
    private readonly _stats: StatsService,
    private readonly _charts: WebhookChartsService,
    private readonly _relayState: RelayStateService,
  ) {}

  onModuleInit() {
    this._subscription.add(
      this._bridge.webhooks$.subscribe((request) => {
        if (request?.action === 'period') {
          // Нативні картки вебхуків мають свій StatsPeriod (Година / Сьогодні / 7 / 30 днів), не вкладки сторінок.
          this._period = (['hour', 'today', 'week', 'month'] as const).find((value) => value === request.period) ?? 'today';
          this._push();
          return;
        }
        if (request?.action === 'save') {
          if (isValidWebhookInput(request.webhook)) this._webhooks.save(request.webhook);
          return;
        }
        if (!request || !Number.isInteger(request.id)) return;
        if (request.action === 'enable' || request.action === 'disable') this._webhooks.setEnabled(request.id, request.action === 'enable');
        if (request.action === 'delete') this._webhooks.delete(request.id);
      }),
    );
    this._subscription.add(merge(this._webhooks.changed$, this._stats.changed$.pipe(filter((ns) => ns === WEBHOOK_EVENTS_STAT_NS)), this._relayState.state$).subscribe(() => this._push()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }

  private _push() {
    const relay = this._webhooks.findActive('relay');
    const webhooks: WebhookInfo[] = this._webhooks.findMany().map((webhook) => ({
      ...webhook,
      status: webhook.type !== 'relay' ? null : webhook.id === relay?.id ? RELAY_STATUS[this._relayState.state.status] : 'off',
      charts: this._charts.cardCharts(webhook.id, this._period),
    }));
    this._bridge.sendWebhooks(webhooks);
  }
}

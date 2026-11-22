import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { merge, Subscription } from 'rxjs';
import type { WebhookInfo } from '@awake/contracts';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { MetricsService } from '../../../metrics';
import { RelayStateService } from '../../../relay/state/relay-state.service';
import type { RelayStatus } from '../../../relay/types/relay-status.types';
import { isValidWebhookInput } from '../../helpers/is-valid-webhook-input';
import { webhookScope } from '../../helpers/webhook-scope';
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

/** Модалка аппки → SQLite; список, лічильники чи стан relay змінились → аппці новий знімок вебхуків. */
@Injectable()
export class WebhooksListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _webhooks: WebhooksService,
    private readonly _metrics: MetricsService,
    private readonly _relayState: RelayStateService,
  ) {}

  onModuleInit() {
    this._subscription.add(
      this._bridge.webhooks$.subscribe((request) => {
        if (request?.action === 'save') {
          if (isValidWebhookInput(request.webhook)) this._webhooks.save(request.webhook);
          return;
        }
        if (!request || !Number.isInteger(request.id)) return;
        if (request.action === 'enable' || request.action === 'disable') this._webhooks.setEnabled(request.id, request.action === 'enable');
        if (request.action === 'delete') this._webhooks.delete(request.id);
      }),
    );
    this._subscription.add(merge(this._webhooks.changed$, this._metrics.changed$, this._relayState.state$).subscribe(() => this._push()));
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }

  private _push() {
    const relay = this._webhooks.findActive('relay');
    const webhooks: WebhookInfo[] = this._webhooks.findMany().map((webhook) => ({
      ...webhook,
      status: webhook.type !== 'relay' ? null : webhook.id === relay?.id ? RELAY_STATUS[this._relayState.state.status] : 'off',
      metrics: this._metrics.get(webhookScope(webhook.id)),
    }));
    this._bridge.sendWebhooks(webhooks);
  }
}

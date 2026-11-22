import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { BotJournalService } from '../bot-journal';
import { MetricsService } from '../metrics';
import { WebhooksService, webhookScope } from '../webhooks';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { RELAY_SETTINGS } from './constants/relay-settings';
import { buildRelayLimitsPage } from './pages/relay-limits-page';
import { buildRelayPage } from './pages/relay-page';
import { buildRelaySessionsPage } from './pages/relay-sessions-page';
import { buildRelayTrackingPage } from './pages/relay-tracking-page';
import { RelayStateService } from './state/relay-state.service';

/**
 * Модуль Webhooxy у MaControl (проксі до вебу): host, ліміти, трекінг і сесії, лише в SwiftUI. Сповіщення — у Telegram. Сам сокет — RelayHostService.
 * id лишається `relay`, щоб збережені налаштування (`relay.enabled`) і команда /relay не змінились.
 */
@Injectable()
export class RelayMacModule implements MacModule {
  readonly id = 'relay';
  readonly title = 'Webhooxy';
  readonly icon = { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = RELAY_SETTINGS;

  constructor(
    private readonly _state: RelayStateService,
    private readonly _journal: BotJournalService,
    private readonly _metrics: MetricsService,
    private readonly _webhooks: WebhooksService,
  ) {}

  pages(ctx: ModuleContext): UiPage[] {
    const { state } = this._state;
    return [
      buildRelayPage(state),
      buildRelayLimitsPage(ctx, state),
      buildRelayTrackingPage(this._trackingMetrics()),
      buildRelaySessionsPage(state),
    ];
  }

  /** Дії через проксі — з журналу бота; решта — лічильники увімкненого вебхука relay. */
  private _trackingMetrics() {
    const journal = this._journal.metrics();
    const relay = this._webhooks.findActive('relay');
    const webhook = relay ? this._metrics.get(webhookScope(relay.id)) : { today: {}, total: {} };
    return { today: { ...journal.today, ...webhook.today }, total: { ...journal.total, ...webhook.total } };
  }

  status(): StatusFields {
    const { status, viewers } = this._state.state;
    return { status, viewers: viewers.length };
  }
}

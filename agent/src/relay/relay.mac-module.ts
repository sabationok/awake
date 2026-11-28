import { Inject, Injectable } from '@nestjs/common';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import type { UiPage } from '@awake/contracts';
import { BotCallsChartsService } from '../bot-journal';
import { statsPeriodSetting } from '../stats';
import { WebhookChartsService, WebhooksService } from '../webhooks';
import type { MacModule, ModuleContext, StatusFields } from '../modules/types/mac-module';
import { RELAY_PROXY_ID } from './constants/relay-proxy';
import { RELAY_SETTINGS, RELAY_TRACKING_PAGE } from './constants/relay-settings';
import { buildRelayLimitsPage } from './pages/relay-limits-page';
import { buildRelayPage } from './pages/relay-page';
import { buildRelaySessionsPage } from './pages/relay-sessions-page';
import { buildRelayTrackingPage, type RelayTrackingPoints } from './pages/relay-tracking-page';
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
  /** Лишаються й тоді, коли webhooxy вимкнено в агенті (їх читає host): пункт меню тоді сірий. */
  readonly settings = [...RELAY_SETTINGS, statsPeriodSetting(RELAY_TRACKING_PAGE)];

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _state: RelayStateService,
    private readonly _calls: BotCallsChartsService,
    private readonly _webhooks: WebhooksService,
    private readonly _webhookCharts: WebhookChartsService,
  ) {}

  /** Жорстко вимкнено в агенті: без `MACONTROL_WEBHOOXY=on` пункт меню сірий і не відкривається. */
  disabled(): string | null {
    return this._config.webhooxy ? null : 'Вимкнено в агенті (MACONTROL_WEBHOOXY)';
  }

  pages(ctx: ModuleContext): UiPage[] {
    const { state } = this._state;
    return [
      buildRelayPage(state, ctx.settingNode('enabled')),
      buildRelayLimitsPage(ctx, state),
      buildRelayTrackingPage(ctx, this._trackingPoints()),
      buildRelaySessionsPage(state),
    ];
  }

  /** Дії через проксі — з журналу бота; решта — події увімкненого вебхука relay. */
  private _trackingPoints(): RelayTrackingPoints {
    return {
      actions: (window) => this._calls.byProxy(window, { [RELAY_PROXY_ID]: '' }),
      // Вебхук шукаємо на кожен тік: його могли замінити, не перебудувавши сторінку.
      events: (window, labels) => this._webhookCharts.eventPoints(this._webhooks.findActive('relay')?.id ?? null, window, labels),
    };
  }

  status(): StatusFields | null {
    if (!this._config.webhooxy) return null;
    const { status, viewers } = this._state.state;
    return { status, viewers: viewers.length };
  }
}

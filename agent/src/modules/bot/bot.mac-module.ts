import { Inject, Injectable } from '@nestjs/common';
import { AGENT_CONFIG, type AgentConfig } from '../../config/agent-config';
import type { SettingDefinition, SettingValue, UiPage } from '@awake/contracts';
import { BotRouterService } from '../../bot';
import { BotCallsChartsService, BotJournalService } from '../../bot-journal';
import { BOT_EVENTS_PAGE_LIMIT } from '../../bot-journal/constants/bot-journal-limits';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { statsPeriodSetting } from '../../stats';
import { TransportsService } from '../../transports';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { MacModule, ModuleContext, StatusFields } from '../types/mac-module';
import { AGENT_ENABLED_SETTING } from './constants/agent-enabled';
import { BOT_NOTIFICATIONS } from './constants/bot-notifications';
import { BOT_STATS_PAGE } from './constants/bot-stats-page';
import { REMOTE_ACCESS_SETTINGS, remotePathOf, type RemotePath } from './constants/remote-access';
import { buildBotJournalPage } from './pages/bot-journal-page';
import { buildBotOverviewPage } from './pages/bot-overview-page';
import { buildBotStatsPage } from './pages/bot-stats-page';

/**
 * Модуль Агент у MaControl: наш бот (BotRouterService) і транспорти, через які в нього приходять дії
 * (Mac, веб, Telegram), з проксі до них (webhooxy, Tailscale → веб). Своє налаштування — «Віддалений доступ» (який шлях);
 * перемикачі самих шляхів — у модулях tailscale і relay, команди Telegram — у модулі Telegram. Сповіщення Агента реєструє в Telegram.
 */
@Injectable()
export class BotMacModule implements MacModule {
  readonly id = 'bot';
  readonly title = 'Агент';
  readonly icon = { symbol: 'cpu.fill', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: SettingDefinition[] = [AGENT_ENABLED_SETTING, ...REMOTE_ACCESS_SETTINGS, statsPeriodSetting(BOT_STATS_PAGE)];

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
    private readonly _calls: BotCallsChartsService,
    private readonly _transports: TransportsService,
    notifications: TelegramNotificationsService,
  ) {
    notifications.register(BOT_NOTIFICATIONS);
  }

  pages(ctx: ModuleContext): UiPage[] {
    const metrics = this._journal.metrics();
    const proxies = this._transports.proxies();
    return [
      buildBotOverviewPage(ctx, this._transports.list(), proxies, metrics, this._remoteAvailability(ctx)),
      buildBotJournalPage(this._journal.findEvents({ pagination: { limit: BOT_EVENTS_PAGE_LIMIT } }), proxies),
      buildBotStatsPage(ctx, this._calls, this._router.namespaces(MACONTROL_BOT), proxies),
    ];
  }

  /** Недоступний шлях не вмикається й в обхід UI (Telegram, старий клієнт); вимкнути можна завжди. */
  rejectSetting(key: string, value: SettingValue, ctx: ModuleContext): string | null {
    const path = remotePathOf(key);
    if (!path || value !== true) return null;
    return this._remoteAvailability(ctx)[path] ? null : `Шлях ${path} вимкнено у його модулі`;
  }

  /** Чи шлях доступний: модуль увімкнено у своїй вкладці (і webhooxy — в агенті). */
  private _remoteAvailability(ctx: ModuleContext): Record<RemotePath, boolean> {
    return {
      tailscale: ctx.setting<boolean>('enabled', 'tailscale'),
      webhooxy: this._config.webhooxy && ctx.setting<boolean>('enabled', 'relay'),
    };
  }

  status(): StatusFields {
    return { eventsToday: this._journal.metrics().today.total ?? 0 };
  }
}

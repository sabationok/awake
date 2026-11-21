import { Injectable } from '@nestjs/common';
import type { SettingDefinition, UiPage } from '@awake/contracts';
import { BotRouterService } from '../../bot';
import { BotJournalService } from '../../bot-journal';
import { BOT_EVENTS_PAGE_LIMIT } from '../../bot-journal/constants/bot-journal-limits';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { TransportsService } from '../../transports';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { MacModule, ModuleContext, StatusFields } from '../types/mac-module';
import { BOT_NOTIFICATIONS } from './constants/bot-notifications';
import { buildBotJournalPage } from './pages/bot-journal-page';
import { buildBotOverviewPage } from './pages/bot-overview-page';
import { buildBotStatsPage } from './pages/bot-stats-page';

/**
 * Модуль Агент у MaControl: наш бот (BotRouterService) і транспорти, через які в нього приходять дії
 * (Mac, веб, webhooxy, Telegram). Власних налаштувань немає: перемикач webhooxy належить модулю relay,
 * команди Telegram — модулю Telegram. Сповіщення Агента реєструє в Telegram.
 */
@Injectable()
export class BotMacModule implements MacModule {
  readonly id = 'bot';
  readonly title = 'Агент';
  readonly icon = { symbol: 'cpu.fill', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: SettingDefinition[] = [];

  constructor(
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
    private readonly _transports: TransportsService,
    notifications: TelegramNotificationsService,
  ) {
    notifications.register(BOT_NOTIFICATIONS);
  }

  pages(ctx: ModuleContext): UiPage[] {
    const metrics = this._journal.metrics();
    return [
      buildBotOverviewPage(ctx, this._transports.list(), metrics),
      buildBotJournalPage(this._journal.findEvents({ limit: BOT_EVENTS_PAGE_LIMIT })),
      buildBotStatsPage(metrics, this._router.namespaces(MACONTROL_BOT)),
    ];
  }

  status(): StatusFields {
    return { eventsToday: this._journal.metrics().today.total ?? 0 };
  }
}

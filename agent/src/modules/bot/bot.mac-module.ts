import { Injectable } from '@nestjs/common';
import type { SettingDefinition, UiPage } from '@awake/contracts';
import { BotRouterService } from '../../bot';
import { BotJournalService } from '../../bot-journal';
import { BOT_EVENTS_PAGE_LIMIT } from '../../bot-journal/constants/bot-journal-limits';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { MacModule, StatusFields } from '../types/mac-module';
import { buildBotCatalogPage } from './pages/bot-catalog-page';
import { buildBotJournalPage } from './pages/bot-journal-page';
import { buildBotMetricsPage } from './pages/bot-metrics-page';

/**
 * Модуль Bot у MaControl: наш бот (BotRouterService), через який ідуть Mac, веб, relay і Telegram.
 * Огляд і журнал усіх викликів, каталог namespace-ів. Під ним же сторінка Relay — проксі до бота.
 * Що приймає Telegram — модуль Telegram.
 */
@Injectable()
export class BotMacModule implements MacModule {
  readonly id = 'bot';
  readonly title = 'Bot';
  readonly icon = { symbol: 'bubble.left.and.bubble.right.fill', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: SettingDefinition[] = [];

  constructor(
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
  ) {}

  pages(): UiPage[] {
    return [
      buildBotMetricsPage(this._journal.metrics(), this._router.namespaces(MACONTROL_BOT)),
      buildBotJournalPage(this._journal.findEvents({ limit: BOT_EVENTS_PAGE_LIMIT })),
      buildBotCatalogPage(this._router.catalog(MACONTROL_BOT)),
    ];
  }

  status(): StatusFields {
    return { eventsToday: this._journal.metrics().today.total ?? 0 };
  }
}

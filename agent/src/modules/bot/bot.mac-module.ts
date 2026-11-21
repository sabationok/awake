import { Injectable } from '@nestjs/common';
import type { SettingDefinition, UiPage } from '@awake/contracts';
import { BotRouterService } from '../../bot';
import { BotJournalService } from '../../bot-journal';
import { BOT_MESSAGES_PAGE_LIMIT } from '../../bot-journal/constants/bot-journal-limits';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { MacModule, ModuleContext, StatusFields } from '../types/mac-module';
import { botCommandSettings } from './helpers/bot-command-settings';
import { buildBotCommandsPage } from './pages/bot-commands-page';
import { buildBotMessagesPage } from './pages/bot-messages-page';
import { buildBotMetricsPage } from './pages/bot-metrics-page';

/**
 * Модуль Bot у MaControl: огляд і лічильники бота, журнал повідомлень і вибір, які модулі бот приймає в Telegram.
 * Сам транспорт і сповіщення — модуль Telegram.
 */
@Injectable()
export class BotMacModule implements MacModule {
  readonly id = 'bot';
  readonly title = 'Bot';
  readonly icon = { symbol: 'bubble.left.and.bubble.right.fill', tone: 'accent' } as const;
  readonly permissions: MacModule['permissions'] = [];

  constructor(
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
  ) {}

  /** Перемикачі будуються з реєстру `@Bot`: новий модуль з ботом одразу з'являється тут. */
  get settings(): SettingDefinition[] {
    return botCommandSettings(this._router.namespaces(MACONTROL_BOT));
  }

  pages(ctx: ModuleContext): UiPage[] {
    const namespaces = this._router.namespaces(MACONTROL_BOT);
    return [
      buildBotMetricsPage(this._journal.run, this._journal.metrics(), namespaces),
      buildBotMessagesPage(this._journal.findMessages({ limit: BOT_MESSAGES_PAGE_LIMIT })),
      buildBotCommandsPage(ctx, namespaces),
    ];
  }

  status(): StatusFields {
    const { today } = this._journal.metrics();
    return { running: this._journal.run.running, commandsToday: (today['in.command'] ?? 0) + (today['in.button'] ?? 0) };
  }
}

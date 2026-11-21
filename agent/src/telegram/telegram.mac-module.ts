import { Injectable } from '@nestjs/common';
import type { SettingDefinition, SettingValue, UiPage } from '@awake/contracts';
import { BotRouterService } from '../bot';
import { BotJournalService } from '../bot-journal';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { TELEGRAM_SETTINGS } from './constants/telegram-settings';
import { telegramCommandSettings } from './helpers/telegram-command-settings';
import { TelegramNotificationsService } from './notifications';
import { buildTelegramCommandsPage } from './pages/telegram-commands-page';
import { buildTelegramNotificationsPage } from './pages/telegram-notifications-page';
import { buildTelegramPage } from './pages/telegram-page';
import { buildTelegramStatsPage } from './pages/telegram-stats-page';
import { TelegramStateService } from './state/telegram-state.service';

/**
 * Модуль Telegram у MaControl. Telegram тут у двох ролях: транспорт у нашого бота (Команди — що він приймає)
 * і центр сповіщень (Сповіщення — реєстр джерел). Дочірні вкладки: Команди, Сповіщення, Статистика.
 */
@Injectable()
export class TelegramMacModule implements MacModule {
  readonly id = 'telegram';
  readonly title = 'Telegram';
  readonly icon = { symbol: 'paperplane.fill', tone: 'accent' } as const;
  // Лише доставляє сповіщення; температуру читає модуль «Стан Mac».
  readonly permissions: MacModule['permissions'] = [];

  constructor(
    private readonly _router: BotRouterService,
    private readonly _journal: BotJournalService,
    private readonly _state: TelegramStateService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  /** Перемикачі команд — з реєстру `@Bot`, сповіщень — з реєстру джерел: новий модуль одразу з'являється тут. */
  get settings(): SettingDefinition[] {
    return [
      ...TELEGRAM_SETTINGS,
      ...telegramCommandSettings(this._router.namespaces(MACONTROL_BOT)),
      ...this._notifications.settings(),
    ];
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [
      buildTelegramPage(ctx, this._state.state),
      buildTelegramCommandsPage(ctx, this._router.namespaces(MACONTROL_BOT)),
      buildTelegramNotificationsPage(ctx, this._notifications.sources()),
      buildTelegramStatsPage(this._journal.metrics()),
    ];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // bot і commands.* обробляє TelegramBotListener; події агента (sleep, relay, bot) шле сам агент.
    // У telegram.env скрипта йдуть лише події, які шле скрипт (джерела з viaMac).
    if (!this._notifications.isViaMac(key)) return;
    ctx.sendToMac({ action: 'setting', key: `telegram.${key}`, value }, 'web');
  }
}

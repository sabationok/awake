import { Injectable } from '@nestjs/common';
import type { SettingDefinition, SettingValue, UiChartPoint, UiPage } from '@awake/contracts';
import { BotRouterService } from '../bot';
import { BotCallsChartsService } from '../bot-journal';
import { counterChartPoints, StatsService, statsPeriodSetting, sumChartPoints, type StatsPeriodWindow } from '../stats';
import { TELEGRAM_COMMANDS_METRIC, TELEGRAM_EVENTS_STAT_NS, TELEGRAM_STATS_PAGE } from './constants/telegram-metrics';
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
    private readonly _calls: BotCallsChartsService,
    private readonly _state: TelegramStateService,
    private readonly _notifications: TelegramNotificationsService,
    private readonly _stats: StatsService,
  ) {}

  /** Перемикачі команд — з реєстру `@Bot`, сповіщень — з реєстру джерел: новий модуль одразу з'являється тут. */
  get settings(): SettingDefinition[] {
    return [
      ...TELEGRAM_SETTINGS,
      statsPeriodSetting(TELEGRAM_STATS_PAGE),
      ...telegramCommandSettings(this._router.namespaces(MACONTROL_BOT)),
      ...this._notifications.settings(),
    ];
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [
      buildTelegramPage(ctx, this._state.state),
      buildTelegramCommandsPage(ctx, this._router.namespaces(MACONTROL_BOT)),
      buildTelegramNotificationsPage(ctx, this._notifications.sources()),
      buildTelegramStatsPage(ctx, (metric, window) => this._statPoints(metric, window)),
    ];
  }

  /**
   * Лічильник Telegram за вікно: команди — виклики бота з джерелом telegram, решта — telegram.events; обидва разом
   * зі старими денними лічильниками журналу бота (bot.legacy), де жили ті самі ключі.
   */
  private _statPoints(metric: string, window: StatsPeriodWindow): UiChartPoint[] {
    if (metric === TELEGRAM_COMMANDS_METRIC) return this._calls.bySource(window, { telegram: '' });
    const { granularity, from, to } = window;
    const events = this._stats.timeline({ namespace: TELEGRAM_EVENTS_STAT_NS, granularity, from, to });
    return sumChartPoints(counterChartPoints(events, 'value', { [metric]: '' }), this._calls.legacy(window, { [metric]: '' }));
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // bot і commands.* обробляє TelegramBotListener; події агента (sleep, relay, bot) шле сам агент.
    // У telegram.env скрипта йдуть лише події, які шле скрипт (джерела з viaMac).
    if (!this._notifications.isViaMac(key)) return;
    ctx.sendToMac({ action: 'setting', key: `telegram.${key}`, value }, 'web');
  }
}

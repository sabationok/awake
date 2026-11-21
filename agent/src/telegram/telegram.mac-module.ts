import { Injectable } from '@nestjs/common';
import type { SettingDefinition, SettingValue, UiPage } from '@awake/contracts';
import { BotRouterService } from '../bot';
import { BotJournalService } from '../bot-journal';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { TELEGRAM_SETTINGS } from './constants/telegram-settings';
import { telegramCommandSettings } from './helpers/telegram-command-settings';
import { buildTelegramPage } from './pages/telegram-page';
import { TelegramStateService } from './state/telegram-state.service';

/**
 * Модуль Telegram у MaControl: перемикач бота, які команди нашого бота Telegram приймає, стан polling-у
 * зі статистикою, і сповіщення, які Mac-аппка пише у свій конфіг скрипта.
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
  ) {}

  /** Перемикачі команд будуються з реєстру `@Bot`: новий модуль з ботом одразу з'являється тут. */
  get settings(): SettingDefinition[] {
    return [...TELEGRAM_SETTINGS, ...telegramCommandSettings(this._router.namespaces(MACONTROL_BOT))];
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildTelegramPage(ctx, this._router.namespaces(MACONTROL_BOT), this._state.state, this._journal.metrics())];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // bot і commands.* обробляє сам TelegramBotListener, на Mac їх не шлемо. Події sleep і relay шле агент
    // (SleepTimerEventsListener, RelayEventsListener), скрипт про них не знає: у telegram.env ідуть лише awake.* і system.*.
    if (!key.startsWith('events.') || key.startsWith('events.sleep.') || key.startsWith('events.relay.')) return;
    ctx.sendToMac({ action: 'setting', key: `telegram.${key}`, value }, 'web');
  }
}

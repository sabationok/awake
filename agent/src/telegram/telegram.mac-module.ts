import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { TELEGRAM_SETTINGS } from './constants/telegram-settings';
import { buildTelegramPage } from './pages/telegram-page';

/** Модуль Telegram у MaControl: перемикач бота і сповіщення, які Mac-аппка пише у свій конфіг скрипта. */
@Injectable()
export class TelegramMacModule implements MacModule {
  readonly id = 'telegram';
  readonly title = 'Telegram';
  readonly icon = { symbol: 'paperplane.fill', tone: 'accent' } as const;
  // Лише доставляє сповіщення; температуру читає модуль «Стан Mac».
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = TELEGRAM_SETTINGS;

  pages(ctx: ModuleContext): UiPage[] {
    return [buildTelegramPage(ctx)];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // bot обробляє сам TelegramBotListener, на Mac його не шлемо. Події sleep шле агент (SleepTimerEventsListener),
    // скрипт про них не знає: у telegram.env ідуть лише awake.* і system.*.
    if (!key.startsWith('events.') || key.startsWith('events.sleep.')) return;
    ctx.sendToMac({ action: 'setting', key: `telegram.${key}`, value }, 'web');
  }
}

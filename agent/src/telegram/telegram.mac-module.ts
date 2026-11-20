import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { TELEGRAM_SETTINGS } from './constants/telegram-settings';
import { buildTelegramPage } from './pages/telegram-page';

/** Модуль Telegram у MacCC: перемикач бота і сповіщення, які Mac-аппка пише у свій конфіг скрипта. */
@Injectable()
export class TelegramMacModule implements MacModule {
  readonly id = 'telegram';
  readonly title = 'Telegram';
  readonly icon = { symbol: 'paperplane.fill', tone: 'accent' } as const;
  readonly settings = TELEGRAM_SETTINGS;

  pages(ctx: ModuleContext): UiPage[] {
    return [buildTelegramPage(ctx)];
  }

  readonly actions: MacModule['actions'] = {};

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // bot обробляє сам TelegramBotListener, на Mac його не шлемо.
    if (!key.startsWith('events.')) return;
    ctx.sendToMac({ action: 'setting', key: `telegram.${key}`, value }, 'web');
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SleepTimerEvent } from '@awake/contracts';
import { filter, type Subscription } from 'rxjs';
import { formatHhmm } from '../../../common/format-hhmm';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { formatEventMessage } from '../../helpers/format-event-message';
import { TelegramBotService } from './telegram-bot.service';

/**
 * Події таймера сну → Telegram. Їх шле агент, а не скрипт: таймер живе в аппці, без процесу скрипта.
 * Перемикачі `events.sleep.start` / `events.sleep.stop` на сторінці Telegram.
 */
@Injectable()
export class SleepTimerEventsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _bot: TelegramBotService,
  ) {}

  onModuleInit() {
    this._subscription = this._bridge.sleepTimers$
      .pipe(filter((event) => !event.silent))
      .subscribe((event) => void this._notify(event));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private async _notify(event: SleepTimerEvent) {
    if (!this._modules.context('telegram').setting<boolean>(`events.sleep.${event.event}`)) return;
    const host = this._bridge.state$.value?.host ?? 'Mac';
    const fields = { event: `sleep.${event.event}`, minutes: event.minutes, until: formatHhmm(event.sleepAt) ?? '—' };
    const message =
      event.event === 'start'
        ? formatEventMessage(host, `🌙 Таймер сну: засне о ${fields.until}`, fields)
        : formatEventMessage(
            host,
            event.reason === 'Mac заснув' ? '💤 Таймер сну: засинаю' : '🌙 Таймер сну завершено',
            { ...fields, reason: event.reason ?? '—' },
          );
    await this._bot.notify(message);
  }
}

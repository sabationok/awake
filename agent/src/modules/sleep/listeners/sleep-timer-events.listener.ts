import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { SleepTimerEvent } from '@awake/contracts';
import { filter, type Subscription } from 'rxjs';
import { formatHhmm } from '../../../common/format-hhmm';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { TelegramNotificationsService } from '../../../telegram/notifications';
import { SLEEP_NOTIFICATIONS } from '../constants/sleep-notifications';

/** Події таймера сну → сповіщення Telegram. Перемикачі `events.sleep.*` — Telegram → Сповіщення. */
@Injectable()
export class SleepTimerEventsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _notifications: TelegramNotificationsService,
  ) {
    _notifications.register(SLEEP_NOTIFICATIONS);
  }

  onModuleInit() {
    this._subscription = this._bridge.sleepTimers$
      .pipe(filter((event) => !event.silent))
      .subscribe((event) => this._notify(event));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private _notify(event: SleepTimerEvent) {
    const fields = { minutes: event.minutes, until: formatHhmm(event.sleepAt) ?? '—' };
    if (event.event === 'start') {
      this._notifications.notify({ source: 'sleep', type: 'start', title: `🌙 Таймер сну: засне о ${fields.until}`, fields });
      return;
    }
    const title = event.reason === 'Mac заснув' ? '💤 Таймер сну: засинаю' : '🌙 Таймер сну завершено';
    this._notifications.notify({ source: 'sleep', type: 'stop', title, fields: { ...fields, reason: event.reason ?? '—' } });
  }
}

import { Injectable, OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { pairwise, type Subscription } from 'rxjs';
import { RelayStateService } from '../../../relay/state/relay-state.service';
import type { RelayViewerSession } from '../../../relay/types/relay-status.types';
import { TelegramNotificationsService } from '../../../telegram/notifications';

/** Той самий пристрій: користувач Web UI і браузер. Новий квиток при перезавантаженні сторінки — не новий пристрій. */
const deviceKey = (viewer: RelayViewerSession) => `${viewer.sub}|${viewer.userAgent ?? ''}`;

/**
 * Сповіщення Агента: «агент запущено» на старті і «новий пристрій», коли підключився viewer, якого ще не було
 * серед останніх сесій. Telegram тримає «запущено», поки не підніметься polling.
 */
@Injectable()
export class BotEventsListener implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _relay: RelayStateService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  onModuleInit() {
    this._subscription = this._relay.state$.pipe(pairwise()).subscribe(([before, after]) => {
      if (after.viewers === before.viewers) return;
      const known = new Set(before.viewers.map(deviceKey));
      after.viewers
        .filter((viewer) => !known.has(deviceKey(viewer)) && !before.viewers.some((old) => old.viewerId === viewer.viewerId))
        .forEach((viewer) => this._notifyDevice(viewer));
    });
  }

  onApplicationBootstrap() {
    this._notifications.notify({ source: 'bot', type: 'started', title: '🟢 Агент запущено', fields: { pid: process.pid } });
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private _notifyDevice(viewer: RelayViewerSession) {
    this._notifications.notify({
      source: 'bot',
      type: 'device',
      title: '📱 Новий пристрій підключено',
      fields: { user: viewer.sub, origin: viewer.origin ?? '—', userAgent: viewer.userAgent ?? '—', via: viewer.proxy ?? 'напряму' },
    });
  }
}

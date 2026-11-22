import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { distinctUntilChanged, filter, map, skip, Subscription } from 'rxjs';
import { describeUserAgent } from '../../devices/helpers/describe-user-agent';
import { PairingService } from '../../devices/services/pairing.service';
import type { PairingEvent } from '../../devices/types/pairing-event.types';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { TAILSCALE_NOTIFICATIONS } from '../constants/tailscale-notifications';
import { TailscaleService } from '../services/tailscale';

const PAIRING_TITLE: Record<PairingEvent['type'], { type: string; title: string }> = {
  requested: { type: 'pairing', title: '🔐 Запит на сполучення через Tailscale' },
  approved: { type: 'paired', title: '✅ Пристрій сполучено через Tailscale' },
  denied: { type: 'paired', title: '🚫 Сполучення через Tailscale відхилено' },
  connected: { type: 'connected', title: '📲 Пристрій увійшов через Tailscale' },
};

/** Tailscale реєструє свої сповіщення в Telegram: serve увімкнувся чи впав, сполучення і входи пристроїв через tailnet. */
@Injectable()
export class TailscaleEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscription = new Subscription();

  constructor(
    private readonly _tailscale: TailscaleService,
    private readonly _pairing: PairingService,
    private readonly _notifications: TelegramNotificationsService,
  ) {
    _notifications.register(TAILSCALE_NOTIFICATIONS);
  }

  onModuleInit() {
    this._subscription.add(
      this._tailscale.state$
        .pipe(
          map(() => this._tailscale.isServing),
          distinctUntilChanged(),
          // Перший стан після запуску агента — не подія.
          skip(1),
        )
        .subscribe((serving) =>
          this._notifications.notify({
            source: 'tailscale',
            type: 'status',
            title: serving ? '🟢 Дашборд через Tailscale працює' : '⚪️ Дашборд через Tailscale вимкнено',
            fields: { host: this._tailscale.state.dnsName ?? '—' },
          }),
        ),
    );
    this._subscription.add(
      this._pairing.events$.pipe(filter((event) => event.via === 'tailnet')).subscribe((event) => {
        const { type, title } = PAIRING_TITLE[event.type];
        this._notifications.notify({ source: 'tailscale', type, title, fields: { device: describeUserAgent(event.userAgent) } });
      }),
    );
  }

  onModuleDestroy() {
    this._subscription.unsubscribe();
  }
}

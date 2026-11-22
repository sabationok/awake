import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AGENT_CONFIG, type AgentConfig } from '../../config/agent-config';
import { debounceTime, distinctUntilChanged, skip, type Subscription } from 'rxjs';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { RELAY_NOTIFICATIONS } from '../constants/relay-notifications';
import { RELAY_STATUS_VIEW } from '../helpers/relay-status-label';
import { RelayStateService } from '../state/relay-state.service';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/** Короткі обриви socket.io перепідключає сам: про них не пишемо. */
const SETTLE_MS = 10_000;

/** Webhooxy реєструє свої сповіщення; тут — «relay активний або ні». Відмови й ліміти шле RelayHostService. */
@Injectable()
export class RelayEventsListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    @Inject(AGENT_CONFIG) config: AgentConfig,
    private readonly _relay: RelayStateService,
    private readonly _notifications: TelegramNotificationsService,
  ) {
    // Webhooxy вимкнено в агенті: його сповіщень у Telegram немає.
    if (config.webhooxy) _notifications.register(RELAY_NOTIFICATIONS);
  }

  onModuleInit() {
    this._subscription = this._relay.state$
      .pipe(
        debounceTime(SETTLE_MS),
        distinctUntilChanged((a, b) => (a.status === 'online') === (b.status === 'online')),
        // Перший стан після запуску агента — не подія.
        skip(1),
      )
      .subscribe((state) => this._notify(state));
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private _notify(state: RelayStateSnapshot) {
    const active = state.status === 'online';
    this._notifications.notify({
      source: 'relay',
      type: 'status',
      title: active ? '📡 Relay активний' : `📴 Relay неактивний: ${RELAY_STATUS_VIEW[state.status].label}`,
      fields: { status: state.status, reason: state.reason ?? '—' },
    });
  }
}

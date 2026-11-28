import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import type { UiNotify } from '@macontrol/contracts';
import { formatHhmm } from '../../common/format-hhmm';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { UiNotifyService } from '../services/ui-notify.service';

type SessionEvent = Parameters<MacBridgeService['sessions$']['next']>[0];
type SleepTimerEvent = Parameters<MacBridgeService['sleepTimers$']['next']>[0];

/** Старт, перезапуск і кінець сесій Awake і Sleeper → тост у кожного клієнта. Тихий кінець Sleeper (перезапуск) — без тосту. */
@Injectable()
export class SessionNotifyListener implements OnModuleInit, OnModuleDestroy {
  private readonly _subscriptions: Subscription[] = [];

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _notify: UiNotifyService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._bridge.sessions$.subscribe((event) => this._notify.notify(awakeNotify(event))),
      this._bridge.sleepTimers$.subscribe((event) => {
        const notify = sleeperNotify(event);
        if (notify) this._notify.notify(notify);
      }),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }
}

function awakeNotify(event: SessionEvent): UiNotify {
  switch (event.event) {
    case 'start':
      return { kind: 'success', title: '☕️ Сон заблоковано', detail: event.duration ? `Сесія Awake на ${event.duration}` : undefined };
    case 'restart':
      return { kind: 'info', title: '🔁 Сесію перезапущено', detail: event.duration ? `Відлік заново: ${event.duration}` : undefined };
    case 'stop':
      return { kind: 'info', title: '😴 Сон повернуто', detail: event.reason ? `Сесію зупинено: ${event.reason}` : 'Сесію зупинено' };
  }
}

function sleeperNotify(event: SleepTimerEvent): UiNotify | null {
  if (event.silent) return null;
  if (event.event === 'start') return { kind: 'success', title: `🌙 Sleeper: засне о ${formatHhmm(event.sleepAt) ?? '—'}` };
  return { kind: 'info', title: '🌙 Sleeper завершено', detail: event.reason ?? undefined };
}

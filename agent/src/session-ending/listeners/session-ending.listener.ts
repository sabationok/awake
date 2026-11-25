import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { interval, type Subscription } from 'rxjs';
import { formatHhmm } from '../../common/format-hhmm';
import { MacBridgeService } from '../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../modules/modules.service';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { SESSION_ENDING_NOTIFICATIONS } from '../constants/session-ending-notifications';
import { SESSION_ENDING_LEAD_DEFAULT, SESSION_ENDING_LEAD_KEY, SESSION_ENDING_POLL_MS } from '../constants/session-ending';
import { shouldWarnEnding } from '../helpers/should-warn-ending';

/** Сесія, що має кінець: ISO кінця і ISO початку (null — невідомо). */
interface EndingSession {
  end: string;
  start: string | null;
}

type EndingKind = 'awake' | 'sleep';

/**
 * Попередження про кінець сесії Awake і таймера сну. Стан Mac читає раз на `SESSION_ENDING_POLL_MS`;
 * сповіщення `ending.<kind>` шле через реєстр Telegram, а перемикачі й «Попереджати за» живуть у модулі telegram.
 */
@Injectable()
export class SessionEndingListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;
  /** Останній `end`, про який уже попередили, за видом сесії. Запис зникає, коли сесії немає. */
  private readonly _warned = new Map<EndingKind, string>();

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _notifications: TelegramNotificationsService,
    private readonly _modules: ModulesService,
  ) {
    _notifications.register(SESSION_ENDING_NOTIFICATIONS);
  }

  onModuleInit() {
    this._subscription = interval(SESSION_ENDING_POLL_MS).subscribe(() => this._check());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  private _check() {
    // `state` стає null, коли Mac мовчить: за застарілим знімком не попереджаємо і нічого не забуваємо.
    const mac = this._bridge.state;
    if (!mac) return;
    const leadMinutes = this._leadMinutes();
    const now = Date.now();
    const awake = mac.active && mac.until ? { end: mac.until, start: mac.startedAt } : null;
    const sleep = mac.sleepAt ? { end: mac.sleepAt, start: mac.sleepStartedAt } : null;
    this._warnIfDue('awake', awake, leadMinutes, now);
    this._warnIfDue('sleep', sleep, leadMinutes, now);
  }

  private _warnIfDue(kind: EndingKind, session: EndingSession | null, leadMinutes: number, now: number) {
    if (!session) {
      this._warned.delete(kind);
      return;
    }
    if (this._warned.get(kind) === session.end) return;
    if (!shouldWarnEnding({ end: session.end, start: session.start, now, leadMinutes })) return;

    this._warned.set(kind, session.end);
    const minutes = Math.ceil((Date.parse(session.end) - now) / 60_000);
    const until = formatHhmm(session.end) ?? '—';
    const title = kind === 'awake' ? `⏳ Awake: сесія скінчиться о ${until}` : `⏳ Sleeper: Mac засне о ${until}`;
    this._notifications.notify({ source: 'ending', type: kind, title, fields: { minutes, until } });
  }

  /** «Попереджати за» з модуля telegram; нечислове значення — за замовчуванням. */
  private _leadMinutes(): number {
    const lead = Number(this._modules.context('telegram').setting<string>(SESSION_ENDING_LEAD_KEY));
    return Number.isFinite(lead) ? lead : Number(SESSION_ENDING_LEAD_DEFAULT);
  }
}

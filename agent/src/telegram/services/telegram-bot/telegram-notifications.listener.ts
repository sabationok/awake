import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, type Subscription } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { formatEventMessage } from '../../helpers/format-event-message';
import { telegramNotificationSettingKey, TelegramNotificationsService, type TelegramNotification } from '../../notifications';
import { TelegramStateService } from '../../state/telegram-state.service';
import { TelegramBotService } from './telegram-bot.service';

/** Скільки сповіщень тримати, поки polling ще не піднявся (старт агента). */
const PENDING_LIMIT = 10;

/**
 * Сповіщення з реєстру → Telegram: перевіряє перемикач `events.<source>.<type>`, додає хост і шле.
 * Поки бот не запущений, тримає кілька останніх, щоб «Агент запущено» не губилось на старті.
 */
@Injectable()
export class TelegramNotificationsListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(TelegramNotificationsListener.name);
  private readonly _subscriptions: Subscription[] = [];
  private _pending: TelegramNotification[] = [];

  constructor(
    private readonly _notifications: TelegramNotificationsService,
    private readonly _state: TelegramStateService,
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _bot: TelegramBotService,
  ) {}

  onModuleInit() {
    this._subscriptions.push(
      this._notifications.notify$.subscribe((notification) => void this._send(notification)),
      this._state.state$.pipe(filter((state) => state.running)).subscribe(() => this._flush()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private async _send(notification: TelegramNotification) {
    if (!this._isEnabled(notification)) return;
    if (!this._state.state.running) {
      this._pending = [...this._pending, notification].slice(-PENDING_LIMIT);
      return;
    }
    const host = this._bridge.state$.value?.host ?? 'Mac';
    const fields = { event: `${notification.source}.${notification.type}`, ...notification.fields };
    await this._bot.notify(formatEventMessage(host, notification.title, fields));
  }

  private _flush() {
    const pending = this._pending;
    this._pending = [];
    pending.forEach((notification) => void this._send(notification));
  }

  private _isEnabled({ source, type }: TelegramNotification): boolean {
    try {
      return this._modules.context('telegram').setting<boolean>(telegramNotificationSettingKey(source, type));
    } catch {
      this._logger.warn(`Сповіщення ${source}.${type} не зареєстроване`);
      return false;
    }
  }
}

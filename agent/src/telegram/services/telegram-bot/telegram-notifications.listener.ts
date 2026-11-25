import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, type Subscription } from 'rxjs';
import { GROUPS_MODULE, GROUPS_NOTIFICATION, GroupsService, GroupsSettingsService, pickDelivery } from '../../../groups';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { ModulesService } from '../../../modules/modules.service';
import { TelegramGroupDeliveryService } from '../../groups/telegram-group-delivery.service';
import { formatEventMessage } from '../../helpers/format-event-message';
import { telegramNotificationSettingKey, TelegramNotificationsService, type TelegramNotification } from '../../notifications';
import { TelegramStateService } from '../../state/telegram-state.service';
import { TelegramBotService } from './telegram-bot.service';

/** Скільки сповіщень тримати, поки polling ще не піднявся (старт агента). */
const PENDING_LIMIT = 10;

/**
 * Сповіщення з реєстру → Telegram: перевіряє перемикач `events.<source>.<type>`, додає хост і шле: у приватний чат
 * власника, у топік джерела в прив'язаній групі або в обидва (`groups.delivery`, `pickDelivery`). Не дійшло в групу —
 * у приватний чат, якщо ввімкнено `groups.fallbackPrivate`, і подія `groups.deliveryFailed`. Джерело з `privateOnly`
 * (події самих «Груп») іде лише в приватний чат.
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
    private readonly _groups: GroupsService,
    private readonly _groupsSettings: GroupsSettingsService,
    private readonly _groupDelivery: TelegramGroupDeliveryService,
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
    const html = formatEventMessage(host, notification.title, fields);
    const privateOnly = this._notifications.sources().some((source) => source.id === notification.source && source.privateOnly === true);
    const addressees = pickDelivery({
      mode: privateOnly ? 'private' : this._groupsSettings.delivery(),
      targets: privateOnly ? [] : this._groups.resolveTargets(notification.source),
    });
    await Promise.all(
      addressees.map(async (addressee) => {
        if (addressee.kind === 'private') return this._bot.notify(html);
        const result = await this._groupDelivery.deliver({ target: addressee.target, source: notification.source, html });
        if (result === 'sent') return;
        // Подія «не дійшло в групу» йде власнику особисто (джерело `groups` — `privateOnly`), тож сама сюди не повертається.
        this._notifications.notify({
          source: GROUPS_MODULE,
          type: GROUPS_NOTIFICATION.deliveryFailed,
          title: '⚠️ Сповіщення не дійшло в групу',
          fields: { notification: `${notification.source}.${notification.type}`, reason: result === 'dropped' ? 'черга групи повна' : 'відправка не вдалась' },
        });
        // Група не прийняла (немає топіка і створити не вдалося, забрали права, бот зупинено, Telegram просить чекати
        // надто довго, сповіщення застаріло в черзі або випало з повної): запасний приватний чат, якщо його не
        // вимкнули (`groups.fallbackPrivate`). Якщо приватний чат і так серед адресатів, другої копії не шлемо.
        if (!this._groupsSettings.fallbackPrivate()) return;
        if (!addressees.some((item) => item.kind === 'private')) await this._bot.notify(html);
      }),
    );
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

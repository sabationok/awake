import { Injectable } from '@nestjs/common';
import type { SettingDefinition } from '@awake/contracts';
import { Subject } from 'rxjs';
import { telegramNotificationSettingKey } from './helpers/telegram-notification-setting-key';
import type { TelegramNotification, TelegramNotificationSource } from './types/telegram-notification.types';

/** Id сторінки Telegram → Сповіщення: її перемикачі хост не дублює на «Налаштуваннях». */
export const TELEGRAM_NOTIFICATIONS_PAGE = 'telegram-notifications';

/**
 * Реєстр сповіщень Telegram. Джерела (Awake, Стан Mac, Таймер сну, Агент, Webhooxy) реєструють себе в конструкторах,
 * перемикачі й вкладки Сповіщень будуються з реєстру. Без залежностей: модулі не тягнуть за собою Telegraf.
 */
@Injectable()
export class TelegramNotificationsService {
  readonly notify$ = new Subject<TelegramNotification>();
  private readonly _sources = new Map<string, TelegramNotificationSource>();

  register(source: TelegramNotificationSource) {
    this._sources.set(source.id, source);
  }

  sources(): TelegramNotificationSource[] {
    return [...this._sources.values()];
  }

  /** Перемикачі всіх подій для модуля telegram. */
  settings(): SettingDefinition[] {
    return this.sources().flatMap((source) =>
      source.events.map(
        (event): SettingDefinition => ({
          type: 'switch',
          key: telegramNotificationSettingKey(source.id, event.type),
          label: event.label,
          icon: event.icon,
          page: TELEGRAM_NOTIFICATIONS_PAGE,
          default: event.default ?? true,
        }),
      ),
    );
  }

  /** Подію шле скрипт Mac (awake.*, system.*): її перемикач треба переслати в аппку. */
  isViaMac(settingKey: string): boolean {
    return this.sources().some((source) => source.viaMac && settingKey.startsWith(`events.${source.id}.`));
  }

  notify(notification: TelegramNotification) {
    this.notify$.next(notification);
  }
}

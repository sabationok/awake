import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { telegramNotificationSettingKey, TELEGRAM_NOTIFICATIONS_PAGE, type TelegramNotificationSource } from '../notifications';

/** Telegram → Сповіщення: вкладка на кожне зареєстроване джерело. */
export function buildTelegramNotificationsPage(ctx: ModuleContext, sources: TelegramNotificationSource[]): UiPage {
  return {
    id: TELEGRAM_NOTIFICATIONS_PAGE,
    module: 'telegram',
    title: 'Сповіщення',
    icon: { symbol: 'bell.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'events',
        type: 'section',
        title: 'Сповіщення',
        footer: 'Модулі реєструють свої події самі: новий модуль зі сповіщеннями з\'являється тут окремою вкладкою.',
        children: [
          {
            id: 'events-tabs',
            type: 'tabs',
            tabs: sources.map((source) => ({
              id: source.id,
              label: source.label,
              children: source.events.map((event) => ctx.settingNode(telegramNotificationSettingKey(source.id, event.type))),
            })),
          },
        ],
      },
    ],
  };
}

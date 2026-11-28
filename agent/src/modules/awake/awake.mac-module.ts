import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@macontrol/contracts';
import { LogsService } from '../../logs/logs.service';
import { SessionsService } from '../../sessions/sessions.service';
import { TelegramNotificationsService } from '../../telegram/notifications';
import { AWAKE_NOTIFICATIONS } from './constants/awake-notifications';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { awakeStatus } from './helpers/awake-status';
import { AWAKE_SETTINGS } from './constants/awake-settings';
import { LOG_QUERY_LIMIT, TRACKING_HISTORY_LIMIT } from './constants/session-limits';
import { STATS_PERIOD_KEY } from '../../stats';
import { buildLogPage } from './pages/log-page';
import { buildSessionPage } from './pages/session-page';
import { buildSessionSettingsPage } from './pages/session-settings-page';
import { buildAwakeHistoryPage } from './pages/history-page';
import { buildTrackingPage } from './pages/tracking-page';

/** Модуль Awake: сесія (Mac не спить), її налаштування, історія сесій і журнал. */
@Injectable()
export class AwakeMacModule implements MacModule {
  readonly id = 'awake';
  readonly title = 'Awake';
  readonly icon = { symbol: 'cup.and.saucer.fill', tone: 'orange' } as const;
  readonly permissions: MacModule['permissions'] = ['sleepControl', 'thermalRead'];
  readonly settings = AWAKE_SETTINGS;

  status(ctx: ModuleContext) {
    return awakeStatus(ctx.mac);
  }

  constructor(
    private readonly _sessions: SessionsService,
    private readonly _logs: LogsService,
    notifications: TelegramNotificationsService,
  ) {
    notifications.register(AWAKE_NOTIFICATIONS);
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [
      buildSessionPage(ctx),
      buildSessionSettingsPage(ctx),
      buildTrackingPage(ctx, (kind, window) => this._sessions.chartPoints(kind, window)),
      buildAwakeHistoryPage(this._sessions.findMany({ pagination: { limit: TRACKING_HISTORY_LIMIT } }), new Date()),
      buildLogPage(this._logs.findMany({ pagination: { limit: LOG_QUERY_LIMIT } }), new Date()),
    ];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    // Вкладка періоду трекінгу — налаштування сторінки, Mac-аппці воно ні до чого.
    if (key === STATS_PERIOD_KEY) return;
    ctx.sendToMac({ action: 'setting', key: `awake.${key}`, value }, 'web');
  }
}

import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import { LogsService } from '../../logs/logs.service';
import { SessionsService } from '../../sessions/sessions.service';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { AWAKE_BOT, awakeStatus } from './bot/awake-bot';
import { AWAKE_SETTINGS } from './constants/awake-settings';
import { DURATION_PATTERN } from './constants/duration-pattern';
import { LOG_QUERY_LIMIT, TRACKING_QUERY_LIMIT } from './constants/session-limits';
import { buildLogPage } from './pages/log-page';
import { buildSessionPage } from './pages/session-page';
import { buildSessionSettingsPage } from './pages/session-settings-page';
import { buildTrackingPage } from './pages/tracking-page';

/** Модуль Awake: сесія (Mac не спить), її налаштування, історія сесій і журнал. */
@Injectable()
export class AwakeMacModule implements MacModule {
  readonly id = 'awake';
  readonly title = 'Awake';
  readonly icon = { symbol: 'cup.and.saucer.fill', tone: 'orange' } as const;
  readonly permissions: MacModule['permissions'] = ['sleepControl', 'thermalRead'];
  readonly settings = AWAKE_SETTINGS;
  readonly bot = AWAKE_BOT;

  status(ctx: ModuleContext) {
    return awakeStatus(ctx.mac);
  }

  readonly actions: MacModule['actions'] = {
    start: (params, ctx, source) => {
      const requested = params.duration;
      const duration =
        typeof requested === 'string' && DURATION_PATTERN.test(requested) ? requested : ctx.setting<string>('duration');
      ctx.sendToMac({ action: 'start', duration }, source);
    },
    stop: (_params, ctx, source) => ctx.sendToMac({ action: 'stop' }, source),
    restoreSleep: (_params, ctx, source) =>
      ctx.sendToMac({ action: 'setting', key: 'awake.restoreSleep', value: true }, source),
    lock: (_params, ctx, source) => ctx.sendToMac({ action: 'lock' }, source),
    displayOff: (_params, ctx, source) => ctx.sendToMac({ action: 'displayOff' }, source),
  };

  constructor(
    private readonly _sessions: SessionsService,
    private readonly _logs: LogsService,
  ) {}

  pages(ctx: ModuleContext): UiPage[] {
    // Одна вибірка на всі сторінки: трекінг рахує за 7 днів і гортає історію.
    const sessions = this._sessions.findMany({ limit: TRACKING_QUERY_LIMIT });
    return [
      buildSessionPage(ctx),
      buildSessionSettingsPage(ctx),
      buildTrackingPage(sessions, new Date()),
      buildLogPage(this._logs.findMany({ limit: LOG_QUERY_LIMIT }), new Date()),
    ];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `awake.${key}`, value }, 'web');
  }
}

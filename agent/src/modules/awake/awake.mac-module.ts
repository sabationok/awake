import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import { SessionsService } from '../../sessions/sessions.service';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { AWAKE_SETTINGS } from './constants/awake-settings';
import { DURATION_PATTERN } from './constants/duration-pattern';
import { SESSION_HISTORY_LIMIT, TRACKING_QUERY_LIMIT } from './constants/session-limits';
import { buildDisplayPage } from './pages/display-page';
import { buildSafetyPage } from './pages/safety-page';
import { buildSessionPage } from './pages/session-page';
import { buildStatusPage } from './pages/status-page';
import { buildTrackingPage } from './pages/tracking-page';

/** Модуль Awake: керування сесією Mac, його стан, історія сесій і налаштування сторінок. */
@Injectable()
export class AwakeMacModule implements MacModule {
  readonly id = 'awake';
  readonly title = 'Awake';
  readonly icon = { symbol: 'cup.and.saucer.fill', tone: 'orange' } as const;
  readonly settings = AWAKE_SETTINGS;

  readonly actions: MacModule['actions'] = {
    start: (params, ctx, source) => {
      const requested = params.duration;
      const duration =
        typeof requested === 'string' && DURATION_PATTERN.test(requested) ? requested : ctx.setting<string>('duration');
      ctx.sendToMac({ action: 'start', duration }, source);
    },
    stop: (_params, ctx, source) => ctx.sendToMac({ action: 'stop' }, source),
    lock: (_params, ctx, source) => ctx.sendToMac({ action: 'lock' }, source),
    displayOff: (_params, ctx, source) => ctx.sendToMac({ action: 'displayOff' }, source),
  };

  constructor(private readonly _sessions: SessionsService) {}

  pages(ctx: ModuleContext): UiPage[] {
    // Одна вибірка на всі сторінки: сесія показує 5, трекінг рахує за 7 днів і гортає історію.
    const sessions = this._sessions.findMany({ limit: TRACKING_QUERY_LIMIT });
    return [
      buildSessionPage(ctx.mac, sessions.slice(0, SESSION_HISTORY_LIMIT)),
      buildStatusPage(ctx.mac),
      buildTrackingPage(sessions, new Date()),
      buildDisplayPage(ctx),
      buildSafetyPage(ctx),
    ];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `awake.${key}`, value }, 'web');
  }
}

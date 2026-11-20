import { Injectable } from '@nestjs/common';
import type { SettingValue, UiPage } from '@awake/contracts';
import { LogsService } from '../../logs/logs.service';
import { SessionsService } from '../../sessions/sessions.service';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { AWAKE_SETTINGS } from './constants/awake-settings';
import { DURATION_PATTERN } from './constants/duration-pattern';
import { buildLogPage } from './pages/log-page';
import { buildSessionPage } from './pages/session-page';
import { buildStatusPage } from './pages/status-page';

/** Модуль Awake: керування сесією Mac, його стан, історія сесій і журнал. */
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

  constructor(
    private readonly _sessions: SessionsService,
    private readonly _logs: LogsService,
  ) {}

  pages(ctx: ModuleContext): UiPage[] {
    return [
      buildSessionPage(ctx.mac, this._sessions.findMany({ limit: 20 })),
      buildStatusPage(ctx.mac),
      buildLogPage(this._logs.findMany({ limit: 50 })),
    ];
  }

  onSettingChanged(key: string, value: SettingValue, ctx: ModuleContext) {
    ctx.sendToMac({ action: 'setting', key: `awake.${key}`, value }, 'web');
  }
}

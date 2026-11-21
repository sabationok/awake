import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { SleepTimersService } from '../../sleep-timers/sleep-timers.service';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { SLEEP_QUERY_LIMIT } from './constants/sleep-limits';
import { SLEEP_SETTINGS } from './constants/sleep-settings';
import { sleepStatus } from './helpers/sleep-status';
import { buildHistoryPage } from './pages/history-page';
import { buildTimerPage } from './pages/timer-page';

/**
 * Модуль «Таймер сну»: окрема сесія, як Awake. Рахує і присипляє Mac сама Mac-аппка,
 * вона ж закриває сесію Awake при старті таймера (і навпаки). Агент пише історію і шле сповіщення.
 */
@Injectable()
export class SleepMacModule implements MacModule {
  readonly id = 'sleep';
  readonly title = 'Таймер сну';
  readonly icon = { symbol: 'moon.zzz.fill', tone: 'indigo' } as const;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings = SLEEP_SETTINGS;

  constructor(private readonly _timers: SleepTimersService) {}

  status(ctx: ModuleContext) {
    return sleepStatus(ctx.mac);
  }

  pages(ctx: ModuleContext): UiPage[] {
    return [buildTimerPage(ctx), buildHistoryPage(this._timers.findMany({ limit: SLEEP_QUERY_LIMIT }), new Date())];
  }
}

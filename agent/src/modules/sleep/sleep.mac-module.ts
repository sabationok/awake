import { Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { SleepTimersService } from '../../sleep-timers/sleep-timers.service';
import type { MacModule, ModuleContext } from '../types/mac-module';
import { buildSleepBot, sleepStatus } from './bot/sleep-bot';
import { SLEEP_BOT_HISTORY_LIMIT, SLEEP_QUERY_LIMIT } from './constants/sleep-limits';
import { SLEEP_SETTINGS } from './constants/sleep-settings';
import { parseMinutes } from './helpers/parse-minutes';
import { plannedMinutes } from './helpers/planned-minutes';
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
  readonly bot = buildSleepBot(() => this._timers.findMany({ limit: SLEEP_BOT_HISTORY_LIMIT }));

  constructor(private readonly _timers: SleepTimersService) {}

  status(ctx: ModuleContext) {
    return sleepStatus(ctx.mac);
  }

  readonly actions: MacModule['actions'] = {
    /** `minutes` з кнопки бота; без нього — за вкладкою «Період» | «Час». Таймер, що йде, ставиться з нуля. */
    start: (params, ctx, source) => {
      const minutes = parseMinutes(params.minutes ?? plannedMinutes(ctx, new Date()));
      if (minutes !== null) ctx.sendToMac({ action: 'sleepTimer', value: minutes }, source);
    },
    stop: (_params, ctx, source) => ctx.sendToMac({ action: 'sleepTimer', value: 0 }, source),
  };

  pages(ctx: ModuleContext): UiPage[] {
    return [buildTimerPage(ctx), buildHistoryPage(this._timers.findMany({ limit: SLEEP_QUERY_LIMIT }), new Date())];
  }
}

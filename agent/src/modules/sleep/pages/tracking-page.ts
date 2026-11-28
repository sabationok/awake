import type { SleepTimerRecord, UiPage } from '@awake/contracts';
import { buildStatsPage } from '../../helpers/build-stats-page';
import type { ModuleContext } from '../../types/mac-module';
import { SLEEP_TRACKING_PAGE } from '../constants/sleep-pages';
import { SLEEP_OUTCOME, sleepTimerOutcome } from '../helpers/sleep-timer-outcome';
import { sleepTimerPoints } from '../helpers/sleep-timer-points';

/** «Трекінг» Sleeper: той самий лейаут, що в Awake — вкладки періоду, підсумок і графік таймерів за наслідком. */
export function buildSleepTrackingPage(ctx: ModuleContext, timers: SleepTimerRecord[]): UiPage {
  const inWindow = (window: { from: Date; to: Date }) =>
    timers.filter((timer) => new Date(timer.startedAt) >= window.from && new Date(timer.startedAt) < window.to);
  return buildStatsPage(ctx, {
    id: SLEEP_TRACKING_PAGE,
    module: 'sleep',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.xaxis', tone: 'indigo' },
    footer: 'Рахується з історії таймерів. Дні, тижні й місяці — за UTC.',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: [
          {
            id: 'timers',
            title: 'Таймерів',
            tones: { [SLEEP_OUTCOME.slept]: 'indigo', [SLEEP_OUTCOME.cancelled]: 'gray', [SLEEP_OUTCOME.running]: 'green' },
            format: 'count',
            total: true,
            points: (window) => sleepTimerPoints(timers, window),
          },
        ],
      },
    ],
    summary: (_totals, window) => {
      const list = inWindow(window);
      const count = (outcome: string) => String(list.filter((timer) => sleepTimerOutcome(timer) === outcome).length);
      return [
        { id: 'slept', type: 'row', label: 'Mac заснув', value: count(SLEEP_OUTCOME.slept) },
        { id: 'cancelled', type: 'row', label: 'Скасовано', value: count(SLEEP_OUTCOME.cancelled) },
      ];
    },
  });
}

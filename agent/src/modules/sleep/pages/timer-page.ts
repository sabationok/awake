import type { MacState, UiNode, UiPage, UiRow } from '@awake/contracts';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { formatClock } from '../../helpers/format-clock';
import { planTabsNode } from '../../helpers/plan-tabs-node';
import { type SessionCard, sessionButtons, sessionTimerNode } from '../../helpers/session-card';
import type { ModuleContext } from '../../types/mac-module';
import { SLEEP_TIMER_OPTIONS } from '../constants/sleep-timer-options';
import { plannedMinutes } from '../helpers/planned-minutes';

/**
 * Сторінка «Таймер сну» за патерном сесії Awake: відлік зверху, вкладки «Період» | «Час» і кнопка внизу.
 * Одночасно працює одна сесія: старт таймера закриває Awake, старт Awake — таймер.
 */
export function buildTimerPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  const now = new Date();
  const card = sleepCard(ctx, mac, plannedMinutes(ctx, now), now);
  const children: UiNode[] = [
    sessionTimerNode(card),
    planTabsNode(
      ctx,
      'sleep',
      { key: 'minutes', label: 'Тривалість', options: SLEEP_TIMER_OPTIONS },
      { key: 'until', label: 'Заснути о', options: UNTIL_OPTIONS },
    ),
  ];
  if (mac?.active && !mac.sleepAt) children.push(awakeRunningRow());
  children.push(sessionButtons(card));
  return {
    id: 'sleep-timer',
    module: 'sleep',
    title: 'Таймер сну',
    icon: { symbol: 'moon.zzz.fill', tone: 'indigo' },
    group: 'modules',
    children: [
      {
        id: 'timer',
        type: 'section',
        footer: 'Mac засне в зазначений час, навіть якщо грає відео. Таймер і сесія Awake не працюють разом: нова сесія завершує попередню.',
        children,
      },
    ],
  };
}

/** Таймер і кнопки таймера сну. */
function sleepCard(ctx: ModuleContext, mac: MacState | null, minutes: number, now: Date): SessionCard {
  return {
    module: 'sleep',
    mac,
    run: mac?.sleepAt ? { until: mac.sleepAt, from: mac.sleepStartedAt, changed: planChanged(ctx, mac, minutes) } : null,
    plannedSeconds: minutes * 60,
    now,
    tone: 'indigo',
    timerId: 'countdown',
    buttonsId: 'timer-buttons',
    texts: {
      running: 'Засинає',
      runningCaption: (until) => `Засне о ${until}`,
      idleCaption: (end) => `Старт — засне о ${end}`,
      stop: 'Скасувати',
    },
  };
}

/** Як у Awake: на вкладці «Час» порівнюємо годину, на «Період» — тривалість таймера, що йде. */
function planChanged(ctx: ModuleContext, mac: MacState, minutes: number): boolean {
  if (!mac.sleepAt) return false;
  if (ctx.setting<string>('mode') === 'time') return formatClock(mac.sleepAt) !== ctx.setting<string>('until');
  if (!mac.sleepStartedAt) return false;
  return Math.round((new Date(mac.sleepAt).getTime() - new Date(mac.sleepStartedAt).getTime()) / 60_000) !== minutes;
}

function awakeRunningRow(): UiRow {
  return {
    id: 'awake-running',
    type: 'row',
    label: 'Іде сесія Awake',
    hint: 'Старт таймера її завершить',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
  };
}

import { showUnless } from '@macontrol/contracts';
import type { MacState, UiNode, UiPage, UiRow } from '@macontrol/contracts';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { planTabsNode } from '../../helpers/plan-tabs-node';
import { type SessionCard, sessionButtons, sessionTimerNodes } from '../../helpers/session-card';
import type { ModuleContext } from '../../types/mac-module';
import { SLEEP_TIMER_OPTIONS } from '../constants/sleep-timer-options';
import { plannedMinutes } from '../helpers/planned-minutes';

/**
 * Сторінка «Sleeper» за патерном сесії Awake: відлік зверху, вкладки «Період» | «Час» і кнопка внизу.
 * Одночасно працює одна сесія: старт таймера закриває Awake, старт Awake — таймер. Як і в Awake, що видно, вирішує
 * `show` за `sessions.sleeper` / `sessions.awake`: старт і скасування міняють лише стейт, не layout.
 */
export function buildTimerPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  const now = new Date();
  const card = sleepCard(mac, plannedMinutes(ctx, now), now);
  const children: UiNode[] = [
    ...sessionTimerNodes(card),
    planTabsNode(
      ctx,
      'sleep',
      { key: 'minutes', label: 'Тривалість', options: SLEEP_TIMER_OPTIONS },
      { key: 'until', label: 'Заснути о', options: UNTIL_OPTIONS },
    ),
  ];
  // Одна сесія за раз: поки йде Awake, таймера немає, тож вистачає умови на Awake.
  if (mac) children.push(awakeRunningRow());
  children.push(...sessionButtons(card));
  return {
    id: 'sleep-timer',
    module: 'sleep',
    title: 'Sleeper',
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
function sleepCard(mac: MacState | null, minutes: number, now: Date): SessionCard {
  return {
    module: 'sleep',
    mac,
    paths: { session: 'sessions.sleeper', until: 'sessions.sleeper.sleepAt', from: 'sessions.sleeper.startedAt' },
    plannedSeconds: minutes * 60,
    now,
    tone: 'indigo',
    timerId: 'countdown',
    buttonsId: 'timer-buttons',
    texts: {
      running: 'Засинає',
      untilCaption: 'Засне о',
      idleCaption: (end) => `Старт — засне о ${end}`,
      stop: 'Скасувати',
    },
  };
}

function awakeRunningRow(): UiRow {
  return {
    id: 'awake-running',
    type: 'row',
    label: 'Іде сесія Awake',
    hint: 'Старт таймера її завершить',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    show: showUnless('sessions.awake', 'null'),
  };
}

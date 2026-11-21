import type { MacState, UiButton, UiButtons, UiNode, UiPage, UiRow, UiTimer } from '@awake/contracts';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { formatClock } from '../../helpers/format-clock';
import { planTabsNode } from '../../helpers/plan-tabs-node';
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
  const minutes = plannedMinutes(ctx, now);
  const children: UiNode[] = [
    timerNode(mac, minutes, now),
    planTabsNode(
      ctx,
      'sleep',
      { key: 'minutes', label: 'Тривалість', options: SLEEP_TIMER_OPTIONS },
      { key: 'until', label: 'Заснути о', options: UNTIL_OPTIONS },
    ),
  ];
  if (mac?.active && !mac.sleepAt) children.push(awakeRunningRow());
  children.push(timerButtons(ctx, mac, minutes));
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

function timerNode(mac: MacState | null, minutes: number, now: Date): UiTimer {
  if (mac === null) return { id: 'countdown', type: 'timer', value: '—', caption: 'Mac офлайн', tone: 'gray' };
  if (mac.sleepAt) {
    return {
      id: 'countdown',
      type: 'timer',
      until: mac.sleepAt,
      from: mac.sleepStartedAt,
      value: 'Засинає',
      caption: `Засне о ${formatClock(mac.sleepAt)}`,
      tone: 'indigo',
    };
  }
  return {
    id: 'countdown',
    type: 'timer',
    value: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:00`,
    caption: `Старт — засне о ${formatClock(new Date(now.getTime() + minutes * 60_000).toISOString())}`,
    tone: 'gray',
  };
}

/** Таймер іде, а вибрано інший час: «Перезапустити» поруч зі «Скасувати». */
function timerButtons(ctx: ModuleContext, mac: MacState | null, minutes: number): UiButtons {
  const start = (label: string): UiButton => ({
    id: 'start',
    label,
    variant: 'filled',
    disabled: mac === null,
    action: { module: 'sleep', name: 'start' },
  });
  const stop: UiButton = { id: 'stop', label: 'Скасувати', variant: 'destructive', action: { module: 'sleep', name: 'stop' } };
  const changed = !!mac?.sleepAt && planChanged(ctx, mac, minutes);
  const buttons = !mac?.sleepAt ? [start('Старт')] : changed ? [start('Перезапустити'), stop] : [stop];
  return { id: 'timer-buttons', type: 'buttons', buttons };
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

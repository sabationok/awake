import type { MacState, UiButton, UiButtons, UiNode, UiPage, UiRow, UiTimer } from '@awake/contracts';
import { formatClock } from '../../helpers/format-clock';
import type { ModuleContext } from '../../types/mac-module';

/**
 * Сторінка «Таймер сну»: відлік зверху, скільки хвилин і кнопка внизу, як у сесії Awake.
 * Одночасно працює одна сесія: старт таймера закриває Awake, старт Awake — таймер.
 */
export function buildTimerPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  const minutes = Number(ctx.setting<string>('minutes'));
  const children: UiNode[] = [timerNode(mac, minutes, new Date()), ctx.settingNode('minutes')];
  if (mac?.active && !mac.sleepAt) children.push(awakeRunningRow());
  children.push(timerButtons(mac, minutes));
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
function timerButtons(mac: MacState | null, minutes: number): UiButtons {
  const start = (label: string): UiButton => ({
    id: 'start',
    label,
    variant: 'filled',
    disabled: mac === null,
    action: { module: 'sleep', name: 'start' },
  });
  const stop: UiButton = { id: 'stop', label: 'Скасувати', variant: 'destructive', action: { module: 'sleep', name: 'stop' } };
  const changed = !!mac?.sleepAt && !!mac.sleepStartedAt && plannedMinutes(mac) !== minutes;
  const buttons = !mac?.sleepAt ? [start('Старт')] : changed ? [start('Перезапустити'), stop] : [stop];
  return { id: 'timer-buttons', type: 'buttons', buttons };
}

function plannedMinutes(mac: MacState): number {
  return Math.round((new Date(mac.sleepAt!).getTime() - new Date(mac.sleepStartedAt!).getTime()) / 60_000);
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

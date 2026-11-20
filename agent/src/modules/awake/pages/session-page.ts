import type { MacState, UiButton, UiButtons, UiNode, UiOption, UiPage, UiRow, UiTimer } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';
import { DURATION_OPTIONS } from '../constants/awake-settings';
import { UNTIL_OPTIONS } from '../constants/until-options';
import { formatBattery } from '../helpers/format-battery';
import { formatClock } from '../helpers/format-clock';
import { durationSeconds, plannedDuration } from '../helpers/session-plan';
import { sleepRow } from '../helpers/sleep-row';
import { thermalPresentation } from '../helpers/thermal-presentation';

/**
 * Сторінка «Сесія»: великий таймер зверху, вкладки «Період» | «Час» і кнопка внизу.
 * Кнопка каже, що станеться: Старт, Стоп або Перезапустити, коли на ходу вибрали інший час.
 */
export function buildSessionPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  const now = new Date();
  const session: UiNode[] = [
    timerNode(ctx, mac, now),
    planTabs(ctx),
    ctx.settingNode('startDisplayOff'),
    ctx.settingNode('startLock'),
  ];
  if (mac && !mac.active && mac.sleepBlocked) session.push(sleepBlockedRow());
  session.push(sessionButtons(ctx, mac));

  const children: UiNode[] = [
    {
      id: 'session',
      type: 'section',
      footer: 'Mac не засинає навіть із закритою кришкою. Сон повертається сам після таймера, при низькому заряді або перегріві, і коли ти виходиш з аппки.',
      children: session,
    },
    { id: 'screen', type: 'section', children: [displayOffNowRow(mac)] },
  ];
  if (mac !== null) {
    children.push({ id: 'state', type: 'section', title: 'Стан', children: stateRows(mac) });
  }
  return {
    id: 'session',
    module: 'awake',
    title: 'Сесія',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    group: 'modules',
    children,
  };
}

/** Відлік, поки сесія йде; без сесії — скільки триватиме та, яку запустить «Старт», і до котрої. */
function timerNode(ctx: ModuleContext, mac: MacState | null, now: Date): UiTimer {
  if (mac === null) {
    return { id: 'timer', type: 'timer', value: '—', caption: 'Mac офлайн', tone: 'gray' };
  }
  if (mac.active) {
    return {
      id: 'timer',
      type: 'timer',
      until: mac.until,
      from: mac.startedAt,
      value: 'Не спить',
      caption: mac.until ? `Не спить до ${formatClock(mac.until)}` : undefined,
      tone: 'orange',
    };
  }
  const seconds = durationSeconds(plannedDuration(ctx, now));
  return {
    id: 'timer',
    type: 'timer',
    value: formatSpan(seconds),
    caption: `Старт — до ${formatClock(new Date(now.getTime() + seconds * 1000).toISOString())}`,
    tone: 'gray',
  };
}

/** Вкладка пише `awake.mode`: від неї залежить, що запустить «Старт». */
function planTabs(ctx: ModuleContext): UiNode {
  return {
    id: 'plan',
    type: 'tabs',
    value: ctx.setting<string>('mode'),
    setting: { module: 'awake', key: 'mode' },
    tabs: [
      { id: 'period', label: 'Період', children: [settingSelectRow(ctx, 'duration', 'Тривалість', DURATION_OPTIONS)] },
      { id: 'time', label: 'Час', children: [settingSelectRow(ctx, 'until', 'Не спати до', UNTIL_OPTIONS)] },
    ],
  };
}

function settingSelectRow(ctx: ModuleContext, key: string, label: string, options: UiOption[]): UiRow {
  return {
    id: `plan-${key}`,
    type: 'row',
    label,
    control: { type: 'select', value: ctx.setting<string>(key), options, setting: { module: 'awake', key } },
  };
}

/** Сесія йде, а вибрано інший час: «Перезапустити» поруч зі «Стоп». */
function sessionButtons(ctx: ModuleContext, mac: MacState | null): UiButtons {
  const start = (label: string): UiButton => ({
    id: 'start',
    label,
    variant: 'filled',
    disabled: mac === null,
    action: { module: 'awake', name: 'start' },
  });
  const stop: UiButton = { id: 'stop', label: 'Стоп', variant: 'destructive', action: { module: 'awake', name: 'stop' } };
  const buttons = !mac?.active ? [start('Старт')] : planChanged(ctx, mac) ? [start('Перезапустити'), stop] : [stop];
  return { id: 'session-buttons', type: 'buttons', buttons };
}

function planChanged(ctx: ModuleContext, mac: MacState): boolean {
  if (ctx.setting<string>('mode') === 'time') {
    return !mac.until || formatClock(mac.until) !== ctx.setting<string>('until');
  }
  return mac.duration !== ctx.setting<string>('duration');
}

function sleepBlockedRow(): UiRow {
  return {
    id: 'sleep-blocked',
    type: 'row',
    label: 'Сон заблоковано поза аппкою',
    dot: { tone: 'red' },
    hint: 'Скрипт не працює, а сон вимкнено',
    control: {
      type: 'button',
      button: { id: 'restore-sleep', label: 'Повернути сон', variant: 'plain', action: { module: 'awake', name: 'restoreSleep' } },
    },
  };
}

/** «2:00:00» для запланованої тривалості. */
function formatSpan(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:00`;
}

/** Дія, а не налаштування: тому тут, а не в «Налаштуваннях сесії». */
function displayOffNowRow(mac: MacState | null): UiRow {
  return {
    id: 'display-off-now',
    type: 'row',
    label: 'Погасити екран зараз',
    control: {
      type: 'button',
      button: {
        id: 'display-off',
        label: 'Погасити',
        variant: 'plain',
        disabled: mac === null,
        action: { module: 'awake', name: 'displayOff' },
      },
    },
  };
}

function stateRows(mac: MacState): UiRow[] {
  const thermal = thermalPresentation(mac.thermal);
  return [
    sleepRow(mac),
    {
      id: 'battery',
      type: 'row',
      label: 'Батарея',
      value: `${formatBattery(mac.battery)} · ${mac.power === 'AC' ? 'від мережі' : 'від батареї'}`,
      icon: { symbol: 'battery.75', tone: 'green' },
    },
    {
      id: 'thermal',
      type: 'row',
      label: 'Температура',
      value: thermal.label,
      icon: { symbol: 'thermometer.medium', tone: thermal.tone },
    },
  ];
}

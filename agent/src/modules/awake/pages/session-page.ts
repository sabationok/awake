import type { MacState, UiControl, UiNode, UiPage, UiRow } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';
import { DURATION_OPTIONS } from '../constants/awake-settings';
import { formatBattery } from '../helpers/format-battery';
import { formatClock } from '../helpers/format-clock';
import { sleepRow } from '../helpers/sleep-row';
import { thermalPresentation } from '../helpers/thermal-presentation';

/** Сторінка «Сесія»: копія головної картки і стану з SwiftUI (SessionSection + StatusSection). */
export function buildSessionPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  const children: UiNode[] = [
    {
      id: 'session',
      type: 'section',
      footer: 'Сесія також зупиняється, коли ти виходиш з аппки.',
      children: [awakeRow(mac), sessionStateRow(ctx, mac)],
    },
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

function awakeRow(mac: MacState | null): UiRow {
  return {
    id: 'awake',
    type: 'row',
    prominent: true,
    label: 'Awake',
    hint: 'Mac не засинає навіть із закритою кришкою. Сон повертається сам після таймера, при низькому заряді або перегріві.',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    control: {
      type: 'switch',
      value: mac?.active ?? false,
      disabled: mac === null,
      on: { module: 'awake', name: 'start' },
      off: { module: 'awake', name: 'stop' },
    },
  };
}

function sessionStateRow(ctx: ModuleContext, mac: MacState | null): UiRow {
  if (mac === null) {
    return {
      id: 'session-state',
      type: 'row',
      label: 'Mac офлайн',
      dot: { tone: 'gray' },
      hint: 'Mac вимкнений, спить або MacCC не запущений',
      control: durationControl(ctx, true),
    };
  }
  if (mac.active) {
    return {
      id: 'session-state',
      type: 'row',
      label: mac.until ? `Не спить до ${formatClock(mac.until)}` : 'Не спить',
      dot: { tone: 'green', pulse: true },
      hint: 'Залишилось',
      countdownTo: mac.until,
      control: durationControl(ctx, true),
    };
  }
  if (mac.sleepBlocked) {
    return {
      id: 'session-state',
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
  return {
    id: 'session-state',
    type: 'row',
    label: 'Тривалість',
    dot: { tone: 'gray' },
    hint: 'Вимкнено',
    control: durationControl(ctx, false),
  };
}

/** Вибір тривалості пише налаштування `awake.duration`, яке потім читає старт. */
function durationControl(ctx: ModuleContext, disabled: boolean): UiControl {
  return {
    type: 'select',
    value: ctx.setting<string>('duration'),
    options: DURATION_OPTIONS,
    disabled,
    setting: { module: 'awake', key: 'duration' },
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

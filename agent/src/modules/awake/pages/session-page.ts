import type { MacState, UiButton, UiNode, UiPage, UiRow } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';
import { DURATION_OPTIONS } from '../constants/awake-settings';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { formatBattery } from '../helpers/format-battery';
import { formatClock } from '../../helpers/format-clock';
import { planTabsNode } from '../../helpers/plan-tabs-node';
import { type SessionCard, sessionButtons, sessionTimerNode } from '../../helpers/session-card';
import { durationSeconds, plannedDuration } from '../helpers/session-plan';
import { sleepRow } from '../helpers/sleep-row';
import { thermalPresentation } from '../helpers/thermal-presentation';

/**
 * Сторінка «Сесія»: великий таймер зверху, вкладки «Період» | «Час» і кнопка внизу.
 * Кнопка каже, що станеться: Старт, Стоп або Перезапустити, коли на ходу вибрали інший час.
 */
export function buildSessionPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  // Без дозволу на керування сном сесію не почати: кажемо чому, а не лишаємо кнопку, яка нічого не зробить.
  const blocked = ctx.missingPermission('sleepControl');
  const card: SessionCard = { ...sessionCard(ctx, mac, new Date()), blocked };
  const session: UiNode[] = [
    ...(blocked ? [noPermissionRow(blocked)] : []),
    sessionTimerNode(card),
    planTabsNode(
      ctx,
      'awake',
      { key: 'duration', label: 'Тривалість', options: DURATION_OPTIONS },
      { key: 'until', label: 'Не спати до', options: UNTIL_OPTIONS },
    ),
    ctx.settingNode('startDisplayOff'),
    ctx.settingNode('startLock'),
  ];
  if (mac && !mac.active && mac.sleepBlocked) session.push(sleepBlockedRow());
  session.push(sessionButtons(card));
  const nowButtons = mac?.active ? sessionNowButtons(ctx) : [];
  if (nowButtons.length) session.push({ id: 'session-now', type: 'buttons', buttons: nowButtons });

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

/** Таймер і кнопки сесії Awake. */
function sessionCard(ctx: ModuleContext, mac: MacState | null, now: Date): SessionCard {
  return {
    module: 'awake',
    mac,
    run: mac?.active ? { until: mac.until, from: mac.startedAt, changed: planChanged(ctx, mac) } : null,
    plannedSeconds: durationSeconds(plannedDuration(ctx, now)),
    now,
    tone: 'orange',
    timerId: 'timer',
    buttonsId: 'session-buttons',
    texts: {
      running: 'Не спить',
      runningCaption: (until) => `Не спить до ${until}`,
      idleCaption: (end) => `Старт — до ${end}`,
      stop: 'Стоп',
    },
  };
}

/**
 * Сесія вже йде, а перемикач вимкнено: те саме можна зробити зараз кнопкою під «Стоп».
 * Увімкнений перемикач кнопку прибирає: він уже спрацював на старті.
 */
function sessionNowButtons(ctx: ModuleContext): UiButton[] {
  const buttons: UiButton[] = [];
  if (!ctx.setting<boolean>('startDisplayOff')) {
    buttons.push({ id: 'session-display-off-now', label: 'Погасити зараз', variant: 'plain', action: { module: 'awake', name: 'displayOff' } });
  }
  if (!ctx.setting<boolean>('startLock')) {
    buttons.push({ id: 'session-lock-now', label: 'Заблокувати зараз', variant: 'plain', action: { module: 'awake', name: 'lock' } });
  }
  return buttons;
}

function planChanged(ctx: ModuleContext, mac: MacState): boolean {
  if (ctx.setting<string>('mode') === 'time') {
    return !mac.until || formatClock(mac.until) !== ctx.setting<string>('until');
  }
  return mac.duration !== ctx.setting<string>('duration');
}

function noPermissionRow(reason: string): UiRow {
  return { id: 'no-permission', type: 'row', label: 'Сесію не запустити', dot: { tone: 'red' }, hint: reason };
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

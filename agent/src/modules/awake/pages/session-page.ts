import { showUnless, showWhen } from '@macontrol/contracts';
import type { MacState, UiButton, UiNode, UiPage, UiRow } from '@macontrol/contracts';
import type { ModuleContext } from '../../types/mac-module';
import { DURATION_OPTIONS } from '../constants/awake-settings';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { formatBattery } from '../helpers/format-battery';
import { planTabsNode } from '../../helpers/plan-tabs-node';
import { type SessionCard, sessionButtons, sessionTimerNodes } from '../../helpers/session-card';
import { durationSeconds, plannedDuration } from '../helpers/session-plan';
import { sleepRows } from '../helpers/sleep-row';
import { thermalPresentation } from '../helpers/thermal-presentation';

/** Сесія йде / ні: за цією гілкою AppState перемикаються таймер, кнопки й «зараз»-дії. */
const SESSION = 'sessions.awake';

/**
 * Сторінка «Сесія»: великий таймер зверху, вкладки «Період» | «Час», перемикачі старту і кнопки внизу.
 * Layout не залежить від того, чи сесія йде: що з чого видно, вирішує `show` за `sessions.awake` (скіл `sdui`
 * «State, bind, show»), тож старт і стоп міняють лише стейт. Без сесії — «Старт»; під час неї — «Стоп» і «Старт»
 * (перезапуск з поточними налаштуваннями), без підтверджень.
 */
export function buildSessionPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  // Без дозволу на керування сном сесію не почати: кажемо чому, а не лишаємо кнопку, яка нічого не зробить.
  const blocked = ctx.missingPermission('sleepControl');
  const card: SessionCard = { ...sessionCard(ctx, mac, new Date()), blocked };
  const session: UiNode[] = [
    ...(blocked ? [noPermissionRow(blocked)] : []),
    ...sessionTimerNodes(card),
    planTabsNode(
      ctx,
      'awake',
      { key: 'duration', label: 'Тривалість', options: DURATION_OPTIONS },
      { key: 'until', label: 'Не спати до', options: UNTIL_OPTIONS },
    ),
    // Видно завжди (owner, 2026-11-28): під час сесії вони діють на «Старт», що її перезапускає.
    ctx.settingNode('startDisplayOff'),
    ctx.settingNode('startLock'),
    ...(mac ? [sleepBlockedRow()] : []),
    ...sessionButtons(card),
    { id: 'session-now', type: 'buttons', buttons: sessionNowButtons(), show: showUnless(SESSION, 'null') },
  ];

  const children: UiNode[] = [
    {
      id: 'session',
      type: 'section',
      footer: 'Mac не засинає навіть із закритою кришкою. Сон повертається сам після таймера, при низькому заряді або перегріві, і коли ти виходиш з аппки.',
      children: session,
    },
    // Під час сесії «Погасити зараз» уже є в картці: окремий рядок був би дублем.
    { id: 'screen', type: 'section', show: showWhen(SESSION, 'null'), children: [displayOffNowRow(mac)] },
  ];
  if (mac !== null) {
    children.push({ id: 'state', type: 'section', title: 'Стан', children: stateRows(mac) });
  }
  return {
    id: 'session',
    module: 'awake',
    title: 'Awake',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    group: 'modules',
    children,
  };
}

/** Таймер і кнопки сесії Awake. */
function sessionCard(ctx: ModuleContext, mac: MacState | null, now: Date): Omit<SessionCard, 'blocked'> {
  return {
    module: 'awake',
    mac,
    paths: { session: SESSION, until: 'sessions.awake.until', from: 'sessions.awake.startedAt' },
    plannedSeconds: durationSeconds(plannedDuration(ctx, now)),
    now,
    tone: 'orange',
    timerId: 'timer',
    buttonsId: 'session-buttons',
    texts: {
      running: 'Не спить',
      untilCaption: 'Не спить до',
      idleCaption: (end) => `Старт — до ${end}`,
      stop: 'Стоп',
    },
  };
}

/**
 * Сесія вже йде: погасити чи заблокувати можна будь-коли кнопкою під «Стоп». Обидві кнопки є завжди, навіть якщо
 * перемикач спрацював на старті: Mac могли вже розблокувати.
 */
function sessionNowButtons(): UiButton[] {
  return [
    { id: 'session-display-off-now', label: 'Погасити зараз', variant: 'plain', action: { module: 'awake', name: 'displayOff' } },
    { id: 'session-lock-now', label: 'Заблокувати зараз', variant: 'plain', action: { module: 'awake', name: 'lock' } },
  ];
}

function noPermissionRow(reason: string): UiRow {
  return { id: 'no-permission', type: 'row', label: 'Сесію не запустити', dot: { tone: 'red' }, hint: reason };
}

/** Сон вимкнено, а сесії немає (`system.sleepBlockedOutside` рахує сервер). */
function sleepBlockedRow(): UiRow {
  return {
    id: 'sleep-blocked',
    type: 'row',
    label: 'Сон заблоковано поза аппкою',
    dot: { tone: 'red' },
    hint: 'Скрипт не працює, а сон вимкнено',
    show: showWhen('system.sleepBlockedOutside', 'true'),
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
    ...sleepRows(),
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

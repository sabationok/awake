import type { MacState, SleepTimerRecord } from '@awake/contracts';
import { escapeHtml } from '../../../common/escape-html';
import { formatHhmm } from '../../../common/format-hhmm';
import type { BotMenu, ModuleBot, StatusFields } from '../../types/mac-module';
import { SLEEP_BOT_HISTORY_LIMIT } from '../constants/sleep-limits';
import { sleepTimerListItem } from '../helpers/sleep-timer-list-item';

/** Хвилини на кнопках екрана `set`, по три в ряд. */
const MINUTES = [
  ['15', '30', '45'],
  ['60', '90', '120'],
];

/** Поля таймера в спільному /status. */
export function sleepStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { sleepAt: mac.sleepAt ? formatHhmm(mac.sleepAt) : null };
}

/**
 * /sleep — єдина команда модуля. Вглиб: `set` (вибір хвилин) і `history` (останні таймери).
 * Історію бот бере з SQLite, тож вона приходить ззовні, а не з ModuleContext.
 */
export function buildSleepBot(history: () => SleepTimerRecord[]): ModuleBot {
  return {
    command: 'sleep',
    description: '🌙 Таймер сну',
    menu: (ctx, screen) => {
      if (screen === 'set') return setScreen(ctx.mac);
      if (screen === 'history') return historyScreen(history());
      return mainScreen(ctx.mac);
    },
  };
}

function mainScreen(mac: MacState | null): BotMenu {
  if (!mac) return { text: '💤 Mac офлайн', buttons: [] };
  const state = mac.sleepAt ? `Mac засне о <b>${formatHhmm(mac.sleepAt)}</b>` : 'Таймера немає';
  const awake = mac.active && !mac.sleepAt ? '\nІде сесія Awake: таймер її завершить.' : '';
  const rows: BotMenu['buttons'] = [
    [{ label: mac.sleepAt ? '⏱ Інший час' : '⏱ Поставити таймер', go: { screen: 'set' } }],
  ];
  if (mac.sleepAt) rows.push([{ label: '✖️ Скасувати', action: 'stop' }]);
  rows.push([{ label: '🕘 Історія', go: { screen: 'history' } }]);
  return { text: `<b>🌙 Таймер сну</b>\n${state}${awake}`, buttons: rows };
}

/** Вибір хвилин ставить таймер з нуля і повертає на головний екран. */
function setScreen(mac: MacState | null): BotMenu {
  return {
    text: `<b>⏱ Через скільки заснути</b>\nЗасне, навіть якщо грає відео.${mac?.active ? '\nСесію Awake буде завершено.' : ''}`,
    buttons: MINUTES.map((row) =>
      row.map((minutes) => ({ label: `${minutes} хв`, action: 'start', params: { minutes }, go: { screen: '' } })),
    ),
    back: { screen: '' },
  };
}

function historyScreen(timers: SleepTimerRecord[]): BotMenu {
  const lines = timers.slice(0, SLEEP_BOT_HISTORY_LIMIT).map((timer) => {
    const item = sleepTimerListItem(timer);
    return `${escapeHtml(item.label)} — ${escapeHtml(item.value ?? '')}\n<i>${escapeHtml(item.hint ?? '')}</i>`;
  });
  return {
    text: `<b>🕘 Останні таймери</b>\n${lines.length ? lines.join('\n') : 'Ще не було жодного'}`,
    buttons: [],
    back: { screen: '' },
  };
}

import type { SleepTimerRecord } from '@awake/contracts';
import { Bot, BotAction, BotCtx, BotParams, BotScreen, BotSource, type BotMenu, type BotParamValue } from '../../bot';
import { escapeHtml } from '../../common/escape-html';
import { formatHhmm } from '../../common/format-hhmm';
import { SleepTimersService } from '../../sleep-timers/sleep-timers.service';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { ModuleContext } from '../types/mac-module';
import type { ModuleSource } from '../types/module-source';
import { SLEEP_BOT_HISTORY_LIMIT } from './constants/sleep-limits';
import { parseMinutes } from './helpers/parse-minutes';
import { plannedMinutes } from './helpers/planned-minutes';
import { sleepTimerListItem } from './helpers/sleep-timer-list-item';

/** Хвилини на кнопках екрана `set`, по три в ряд. */
const MINUTES = [
  ['15', '30', '45'],
  ['60', '90', '120'],
];

/** Дії таймера сну і /sleep: головний екран, `set` (вибір хвилин) і `history` (останні таймери). */
@Bot(MACONTROL_BOT, { namespace: 'sleep', command: 'sleep', description: '🌙 Таймер сну' })
export class SleepBot {
  constructor(private readonly _timers: SleepTimersService) {}

  /** `minutes` з кнопки бота; без нього — за вкладкою «Період» | «Час». Таймер, що йде, ставиться з нуля. */
  @BotAction('start')
  start(@BotParams('minutes') requested: BotParamValue | undefined, @BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    const minutes = parseMinutes(requested ?? plannedMinutes(ctx, new Date()));
    if (minutes !== null) ctx.sendToMac({ action: 'sleepTimer', value: minutes }, source);
  }

  @BotAction('stop')
  stop(@BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    ctx.sendToMac({ action: 'sleepTimer', value: 0 }, source);
  }

  @BotScreen()
  main(@BotCtx() { mac }: ModuleContext): BotMenu {
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
  @BotScreen('set')
  set(@BotCtx() { mac }: ModuleContext): BotMenu {
    return {
      text: `<b>⏱ Через скільки заснути</b>\nЗасне, навіть якщо грає відео.${mac?.active ? '\nСесію Awake буде завершено.' : ''}`,
      buttons: MINUTES.map((row) =>
        row.map((minutes) => ({ label: `${minutes} хв`, action: 'start', params: { minutes }, go: { screen: '' } })),
      ),
      back: { screen: '' },
    };
  }

  @BotScreen('history')
  history(): BotMenu {
    return {
      text: `<b>🕘 Останні таймери</b>\n${historyLines(this._timers.findMany({ pagination: { limit: SLEEP_BOT_HISTORY_LIMIT } }))}`,
      buttons: [],
      back: { screen: '' },
    };
  }
}

function historyLines(timers: SleepTimerRecord[]): string {
  const lines = timers.map((timer) => {
    const item = sleepTimerListItem(timer);
    return `${escapeHtml(item.label)} — ${escapeHtml(item.value ?? '')}\n<i>${escapeHtml(item.hint ?? '')}</i>`;
  });
  return lines.length ? lines.join('\n') : 'Ще не було жодного';
}

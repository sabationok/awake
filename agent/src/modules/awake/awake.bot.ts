import { Bot, BotAction, BotCtx, BotParams, BotScreen, BotSource, type BotMenu, type BotParamValue } from '../../bot';
import { escapeHtml } from '../../common/escape-html';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { ModuleContext } from '../types/mac-module';
import type { ModuleSource } from '../types/module-source';
import { DURATION_PATTERN } from './constants/duration-pattern';
import { awakeStatus } from './helpers/awake-status';
import { plannedDuration } from './helpers/session-plan';

/** Швидкі тривалості під /awake. */
const QUICK_DURATIONS = [
  { duration: '1h', label: '1 год' },
  { duration: '2h', label: '2 год' },
  { duration: '4h', label: '4 год' },
];

/** Дії сесії Awake (кнопки SDUI і Telegram) і екран /awake. */
@Bot(MACONTROL_BOT, { namespace: 'awake', command: 'awake', description: '☕️ Awake' })
export class AwakeBot {
  /** `duration` з кнопки бота; без нього — за вкладкою «Період» | «Час». */
  @BotAction('start')
  start(@BotParams('duration') requested: BotParamValue | undefined, @BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    const duration =
      typeof requested === 'string' && DURATION_PATTERN.test(requested) ? requested : plannedDuration(ctx, new Date());
    ctx.sendToMac({ action: 'start', duration }, source);
    // Перемикачі на сторінці сесії: що зробити одразу після старту. Блокування гасить і екран.
    if (ctx.setting<boolean>('startLock')) ctx.sendToMac({ action: 'lock' }, source);
    else if (ctx.setting<boolean>('startDisplayOff')) ctx.sendToMac({ action: 'displayOff' }, source);
  }

  @BotAction('stop')
  stop(@BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    ctx.sendToMac({ action: 'stop' }, source);
  }

  @BotAction('restoreSleep')
  restoreSleep(@BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    ctx.sendToMac({ action: 'setting', key: 'awake.restoreSleep', value: true }, source);
  }

  @BotAction('lock')
  lock(@BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    ctx.sendToMac({ action: 'lock' }, source);
  }

  @BotAction('displayOff')
  displayOff(@BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    ctx.sendToMac({ action: 'displayOff' }, source);
  }

  @BotScreen()
  main(@BotCtx() ctx: ModuleContext): BotMenu {
    const fields = awakeStatus(ctx.mac);
    const text = fields ? `<b>☕️ Awake</b>\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>` : '💤 Mac офлайн';
    return {
      text,
      buttons: [
        QUICK_DURATIONS.map(({ duration, label }) => ({ label, action: 'start', params: { duration } })),
        [
          { label: 'Стоп', action: 'stop' },
          { label: 'Екран', action: 'displayOff' },
          { label: 'Замок', action: 'lock' },
        ],
      ],
    };
  }
}

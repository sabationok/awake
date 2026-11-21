import { Bot, BotCtx, BotScreen, type BotMenu } from '../../bot';
import { escapeHtml } from '../../common/escape-html';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { ModuleContext } from '../types/mac-module';

/** /status: спільний стан, кожен модуль під своїм ключем (`system`, `media`, `awake` — поки йде сесія…). */
@Bot(MACONTROL_BOT, { namespace: 'system', command: 'status', description: 'Стан Mac і модулів' })
export class MacBot {
  @BotScreen()
  main(@BotCtx() ctx: ModuleContext): BotMenu {
    if (!ctx.mac) return { text: '💤 Mac офлайн', buttons: [] };
    return {
      text: `<b>${escapeHtml(ctx.mac.host)}</b>\n<pre>${escapeHtml(JSON.stringify(ctx.status(), null, 2))}</pre>`,
      buttons: [],
    };
  }
}

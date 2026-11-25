import { Bot, BotAction, BotCtx, BotParams, BotScreen, BotSource, type BotMenu, type BotParamValue } from '../bot';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import { ModulesService } from '../modules/modules.service';
import type { ModuleContext } from '../modules/types/mac-module';
import type { ModuleSource } from '../modules/types/module-source';
import { SESSION_ENDING_LEAD_KEY, SESSION_ENDING_LEAD_OPTIONS } from '../session-ending/constants/session-ending';

/** Кнопки «Попереджати за» по три в ряд: значення налаштування — хвилини рядком. */
const LEAD_ROWS = [SESSION_ENDING_LEAD_OPTIONS.slice(0, 3), SESSION_ENDING_LEAD_OPTIONS.slice(3)];

/** Екран Telegram: «Попереджати про кінець сесії» (налаштування `events.ending.lead` модуля telegram). */
@Bot(MACONTROL_BOT, { namespace: 'telegram', description: '⏳ Попередження про кінець' })
export class TelegramBot {
  constructor(private readonly _modules: ModulesService) {}

  /** Через dispatch: налаштування збережеться й піде у звичайний шлях (Mac отримає знімок). Невідоме значення ігнорується. */
  @BotAction('setLead')
  async setLead(@BotParams('minutes') requested: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    const value = String(requested);
    if (!SESSION_ENDING_LEAD_OPTIONS.some((option) => option.value === value)) return;
    await this._modules.dispatch({ type: 'setting', change: { module: 'telegram', key: SESSION_ENDING_LEAD_KEY, value } }, source);
  }

  @BotScreen()
  main(@BotCtx() ctx: ModuleContext): BotMenu {
    const current = ctx.setting<string>(SESSION_ENDING_LEAD_KEY);
    const label = SESSION_ENDING_LEAD_OPTIONS.find((option) => option.value === current)?.label ?? current;
    return {
      text: `<b>⏳ Попереджати про кінець сесії</b>\nЗараз: за <b>${label}</b> до кінця.\nПопередження приходить про сесію Awake і таймер сну.`,
      buttons: LEAD_ROWS.map((row) =>
        row.map((option) => ({
          label: `${option.value === current ? '✓ ' : ''}${option.value} хв`,
          action: 'setLead',
          params: { minutes: option.value },
        })),
      ),
    };
  }
}

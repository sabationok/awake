import { Bot, BotAction, BotCtx, BotParams, BotScreen, BotSource, type BotMenu, type BotParamValue } from '../bot';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import { ModulesService } from '../modules/modules.service';
import type { ModuleContext } from '../modules/types/mac-module';
import type { ModuleSource } from '../modules/types/module-source';
import { SESSION_ENDING_LEAD_KEYS, SESSION_ENDING_LEAD_OPTIONS } from '../session-ending/constants/session-ending';

/** Вид сесії, про кінець якої попереджаємо: у кожного свій час. */
type EndingKind = keyof typeof SESSION_ENDING_LEAD_KEYS;

const KIND_LABEL: Record<EndingKind, string> = { awake: 'Awake', sleep: 'Sleeper' };

/** Екран Telegram: «Попереджати про кінець сесії» окремо для Awake і Sleeper (`events.ending.<вид>.lead` модуля telegram). */
@Bot(MACONTROL_BOT, { namespace: 'telegram', description: '⏳ Попередження про кінець' })
export class TelegramBot {
  constructor(private readonly _modules: ModulesService) {}

  /** Через dispatch: налаштування збережеться й піде у звичайний шлях (Mac отримає знімок). Невідоме значення ігнорується. */
  @BotAction('setLead')
  async setLead(
    @BotParams('kind') kind: BotParamValue | undefined,
    @BotParams('minutes') requested: BotParamValue | undefined,
    @BotSource() source: ModuleSource,
  ) {
    const value = String(requested);
    if (kind !== 'awake' && kind !== 'sleep') return;
    if (!SESSION_ENDING_LEAD_OPTIONS.some((option) => option.value === value)) return;
    await this._modules.dispatch({ type: 'setting', change: { module: 'telegram', key: SESSION_ENDING_LEAD_KEYS[kind], value } }, source);
  }

  @BotScreen()
  main(@BotCtx() ctx: ModuleContext): BotMenu {
    const kinds = Object.keys(SESSION_ENDING_LEAD_KEYS) as EndingKind[];
    const current = (kind: EndingKind) => ctx.setting<string>(SESSION_ENDING_LEAD_KEYS[kind]);
    const label = (kind: EndingKind) => SESSION_ENDING_LEAD_OPTIONS.find((option) => option.value === current(kind))?.label ?? current(kind);
    return {
      text: [
        '<b>⏳ Попереджати про кінець сесії</b>',
        ...kinds.map((kind) => `${KIND_LABEL[kind]}: за <b>${label(kind)}</b> до кінця.`),
      ].join('\n'),
      buttons: kinds.map((kind) =>
        SESSION_ENDING_LEAD_OPTIONS.map((option) => ({
          label: `${option.value === current(kind) ? '✓ ' : ''}${KIND_LABEL[kind]} ${option.value}`,
          action: 'setLead',
          params: { kind, minutes: option.value },
        })),
      ),
    };
  }
}

import { Bot, BotAction, BotCtx, BotScreen, BotSource, type BotMenu } from '../bot';
import { escapeHtml } from '../common/escape-html';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import { ModulesService } from '../modules/modules.service';
import type { ModuleContext } from '../modules/types/mac-module';
import type { ModuleSource } from '../modules/types/module-source';
import { RELAY_STATUS_VIEW } from './helpers/relay-status-label';
import { RelayStateService } from './state/relay-state.service';

/** /relay: стан і перемикач relay з Telegram, навіть коли на Mac ніхто не дивиться. */
@Bot(MACONTROL_BOT, { namespace: 'relay', command: 'relay', description: '📡 Relay' })
export class RelayBot {
  constructor(
    private readonly _modules: ModulesService,
    private readonly _state: RelayStateService,
  ) {}

  @BotAction('enable')
  async enable(@BotSource() source: ModuleSource) {
    await this._setEnabled(true, source);
  }

  @BotAction('disable')
  async disable(@BotSource() source: ModuleSource) {
    await this._setEnabled(false, source);
  }

  @BotScreen()
  main(@BotCtx() ctx: ModuleContext): BotMenu {
    const { status, reason, viewers } = this._state.state;
    const enabled = ctx.setting<boolean>('enabled');
    const lines = [`<b>📡 Relay</b>: ${escapeHtml(RELAY_STATUS_VIEW[status].label)}`];
    if (reason) lines.push(escapeHtml(reason));
    lines.push(`Сесій: ${viewers.length}`);
    return {
      text: lines.join('\n'),
      buttons: [[enabled ? { label: 'Вимкнути', action: 'disable' } : { label: 'Увімкнути', action: 'enable' }]],
    };
  }

  /** Через dispatch: налаштування збережеться, Mac отримає знімок, а host підхопить зміну. */
  private _setEnabled(value: boolean, source: ModuleSource) {
    return this._modules.dispatch({ type: 'setting', change: { module: 'relay', key: 'enabled', value } }, source);
  }
}

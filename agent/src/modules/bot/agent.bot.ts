import { Bot, BotAction, BotParams, type BotParamValue } from '../../bot';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import { ModulesService } from '../modules.service';

/** Дії Агента без команди Telegram: порядок модулів у меню з «Упорядкувати» (Mac і веб). */
@Bot(MACONTROL_BOT, { namespace: 'bot' })
export class AgentBot {
  constructor(private readonly _modules: ModulesService) {}

  /** `ids` — id модулів через кому в новому порядку; невідомі відкидаються, пропущені стають у кінець. */
  @BotAction('reorderModules')
  reorderModules(@BotParams('ids') ids: BotParamValue | undefined) {
    if (typeof ids !== 'string') throw new Error('Потрібен порядок модулів');
    this._modules.reorder(ids.split(',').map((id) => id.trim()).filter(Boolean));
  }
}

import { Bot, BotAction, BotParams, BotSource, type BotParamValue } from '../bot';
import { PairingService } from '../devices/services/pairing.service';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import type { ModuleSource } from '../modules/types/module-source';
import { TrustedNetworksService } from '../trusted-networks';
import { WebSessionsService } from '../web-auth/services/web-sessions.service';
import { WEB_UI_MODULE } from './constants/web-ui';

/**
 * Дії сторінок «Web UI». Усі приймаються лише з Mac: сполучений пристрій не має керувати іншими пристроями,
 * чужими сесіями чи списком мереж, у яких сервер відповідає. Команди в Telegram немає.
 */
@Bot(MACONTROL_BOT, { namespace: WEB_UI_MODULE })
export class WebUiBot {
  constructor(
    private readonly _sessions: WebSessionsService,
    private readonly _pairing: PairingService,
    private readonly _networks: TrustedNetworksService,
  ) {}

  @BotAction('endSession')
  endSession(@BotParams('id') id: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof id === 'string') this._sessions.revoke(id);
  }

  @BotAction('revokeDevice')
  revokeDevice(@BotParams('id') id: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof id === 'number') this._pairing.revoke(id);
  }

  @BotAction('addNetwork')
  addNetwork(@BotParams('ssid') ssid: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof ssid === 'string') this._networks.add(ssid);
  }

  @BotAction('removeNetwork')
  removeNetwork(@BotParams('ssid') ssid: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof ssid === 'string') this._networks.remove(ssid);
  }
}

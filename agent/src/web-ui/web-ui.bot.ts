import { Bot, BotAction, BotParams, BotSource, type BotParamValue } from '../bot';
import { PairingService } from '../devices/services/pairing.service';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import type { ModuleSource } from '../modules/types/module-source';
import { OwnerAuthService } from '../mac-helper/services/owner-auth.service';
import { AppSecretsService } from '../secrets';
import { TrustedNetworksService } from '../trusted-networks';
import { MIN_PASSWORD_LENGTH } from '../web-auth/constants/web-auth';
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
    private readonly _secrets: AppSecretsService,
    private readonly _ownerAuth: OwnerAuthService,
  ) {}

  @BotAction('endSession')
  endSession(@BotParams('id') id: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof id === 'string') this._sessions.revoke(id);
  }

  @BotAction('revokeDevice')
  async revokeDevice(@BotParams('id') id: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof id === 'number') await this._pairing.revoke(id);
  }

  @BotAction('addNetwork')
  addNetwork(@BotParams('ssid') ssid: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof ssid === 'string') this._networks.add(ssid);
  }

  @BotAction('removeNetwork')
  removeNetwork(@BotParams('ssid') ssid: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && typeof ssid === 'string') this._networks.remove(ssid);
  }

  /**
   * Remote KV Store з форми «Мережі»: REST URL і токен Upstash пишуться в secrets.env на цьому Mac. Порожній токен
   * лишає збережений. Клієнт сервера підхоплює нові ключі без перезапуску.
   */
  @BotAction('setRemoteStore')
  async setRemoteStore(
    @BotParams('url') url: BotParamValue | undefined,
    @BotParams('token') token: BotParamValue | undefined,
    @BotSource() source: ModuleSource,
  ) {
    if (source !== 'mac') throw new Error('Змінити можна лише в аппці на Mac');
    if (typeof url !== 'string' || !/^https:\/\/\S+$/.test(url.trim())) throw new Error('REST URL має починатися з https://');
    const hasToken = typeof token === 'string' && token.trim() !== '';
    if (!hasToken && !this._secrets.get('upstashToken')) throw new Error('Потрібен REST токен');
    const updates = new Map<'upstashUrl' | 'upstashToken', string>([['upstashUrl', url.trim()]]);
    if (hasToken) updates.set('upstashToken', (token as string).trim());
    await this._ownerAuth.confirm('змінити ключі Remote KV Store');
    this._secrets.save(updates);
  }

  /** Пароль Web UI з форми на «Вході»: пишеться в secrets.env на цьому Mac. Лише з Mac, щонайменше 12 символів. */
  @BotAction('setPassword')
  async setPassword(
    @BotParams('password') password: BotParamValue | undefined,
    @BotParams('repeat') repeat: BotParamValue | undefined,
    @BotSource() source: ModuleSource,
  ) {
    if (source !== 'mac') throw new Error('Змінити можна лише в аппці на Mac');
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) throw new Error(`Пароль — щонайменше ${MIN_PASSWORD_LENGTH} символів`);
    if (password !== repeat) throw new Error('Паролі не збігаються');
    await this._ownerAuth.confirm('змінити пароль Web UI');
    this._secrets.save(new Map([['dashboardPassword', password]]));
  }

  /** Ключ JWT з форми на «Вході»: пишеться в secrets.env на цьому Mac, через Touch ID. Лише з Mac. */
  @BotAction('setJwtKey')
  async setJwtKey(@BotParams('key') key: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source !== 'mac') throw new Error('Змінити можна лише в аппці на Mac');
    if (typeof key !== 'string' || key.trim() === '') throw new Error('Потрібен ключ');
    await this._ownerAuth.confirm('змінити ключ JWT Web UI');
    this._secrets.save(new Map([['jwtKey', key.trim()]]));
  }

  /** «Новий код» на «Пристроях»: усі видані коди перестають діяти, QR оновлюється. Лише з Mac. */
  @BotAction('newPairingCode')
  newPairingCode(@BotSource() source: ModuleSource) {
    if (source === 'mac') this._pairing.resetCodes();
  }

  /** «Дозволити» / «Відхилити» на запиті сполучення. Лише з Mac: пристрій не пускає сам себе. */
  @BotAction('answerPairing')
  async answerPairing(
    @BotParams('id') id: BotParamValue | undefined,
    @BotParams('approve') approve: BotParamValue | undefined,
    @BotSource() source: ModuleSource,
  ) {
    if (source === 'mac' && typeof id === 'string') await this._pairing.answer(id, approve === true);
  }
}

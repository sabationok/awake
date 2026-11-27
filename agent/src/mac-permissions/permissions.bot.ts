import { Bot, BotAction, BotParams, BotSource, type BotParamValue } from '../bot';
import { MACONTROL_BOT } from '../modules/constants/macontrol-bot';
import type { ModuleSource } from '../modules/types/module-source';
import { isMacPermission, isPrivacyAccessKind, PERMISSIONS_MODULE } from './constants/permissions';
import { MacPermissionsService } from './mac-permissions.service';

/** Дії сторінки «Дозволи». Команди в Telegram немає: дозволи там не міняються. */
@Bot(MACONTROL_BOT, { namespace: PERMISSIONS_MODULE })
export class PermissionsBot {
  constructor(private readonly _permissions: MacPermissionsService) {}

  /** Перемикач «Дозволено модулю»: з аппки або з локального Web UI. */
  @BotAction('setModule')
  setModule(
    @BotParams('module') module: BotParamValue | undefined,
    @BotParams('permission') permission: BotParamValue | undefined,
    @BotParams('allowed') allowed: BotParamValue | undefined,
    @BotSource() source: ModuleSource,
  ) {
    if (source === 'telegram' || typeof module !== 'string' || !isMacPermission(permission)) return;
    this._permissions.setModule(module, permission, allowed === true || allowed === 'true');
  }

  /** Видати дозвіл у системі: лише з Mac, бо вікно пароля macOS з'явиться на його екрані. */
  @BotAction('grant')
  async grant(@BotParams('permission') permission: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && isMacPermission(permission)) await this._permissions.change('grant', permission);
  }

  /** Дозвіл macOS помічника (геолокація, Bluetooth): лише з Mac, системне вікно з'явиться на його екрані. */
  @BotAction('requestAccess')
  async requestAccess(@BotParams('access') access: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && isPrivacyAccessKind(access)) await this._permissions.requestAccess(access);
  }

  @BotAction('revoke')
  async revoke(@BotParams('permission') permission: BotParamValue | undefined, @BotSource() source: ModuleSource) {
    if (source === 'mac' && isMacPermission(permission)) await this._permissions.change('revoke', permission);
  }
}

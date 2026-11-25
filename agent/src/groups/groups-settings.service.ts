import { Injectable } from '@nestjs/common';
import type { SettingDefinition } from '@awake/contracts';
import { resolveSettingValue } from '../modules/helpers/resolve-setting-value';
import { SettingsService } from '../settings/settings.service';
import { TelegramNotificationsService } from '../telegram/notifications';
import { GROUPS_MODULE } from './constants/groups-module';
import { GROUPS_COMMANDS_SETTING, GROUPS_DELIVERY_SETTING, GROUPS_FALLBACK_PRIVATE_SETTING, GROUPS_UI_SETTINGS } from './constants/groups-settings';
import { groupsTopicSetting } from './helpers/groups-topic-setting';
import type { GroupTopicSource } from './types/group-topic-row.types';
import type { GroupsDeliveryMode } from './types/groups-delivery.types';

/**
 * Налаштування модуля «Групи» для його ж сервісів і для конектора: ті самі описи, що в маніфесті, і ті самі
 * збережені значення (`groups.<key>`). Ядро груп не може читати їх через ModulesService (той сам залежить від
 * маніфесту груп), тому читає сховище напряму, як Proximity. Запис іде лише через ModulesService.dispatch.
 */
@Injectable()
export class GroupsSettingsService {
  constructor(
    private readonly _settings: SettingsService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  /** Усі налаштування модуля: статичні і `topic.<source>` на кожне джерело, що може мати топік. */
  definitions(): SettingDefinition[] {
    return [...GROUPS_UI_SETTINGS, ...this.topicSources().map(groupsTopicSetting)];
  }

  /**
   * Джерела сповіщень, які можуть мати свій топік: усі з реєстру, крім тих, що йдуть лише власнику особисто
   * (`privateOnly`). Реєстр поки названий Telegram-ним — це борг реєстру, а не залежність від Telegraf.
   */
  topicSources(): GroupTopicSource[] {
    return this._notifications
      .sources()
      .filter((source) => source.privateOnly !== true)
      .map((source) => ({ id: source.id, label: source.label, viaMac: source.viaMac }));
  }

  delivery(): GroupsDeliveryMode {
    return this._read(GROUPS_DELIVERY_SETTING) as GroupsDeliveryMode;
  }

  /** Чи слати в приватний чат сповіщення, яке не дійшло в групу. */
  fallbackPrivate(): boolean {
    return this._read(GROUPS_FALLBACK_PRIVATE_SETTING) === true;
  }

  /** Чи слухати команди й кнопки в прив'язаній групі. */
  commands(): boolean {
    return this._read(GROUPS_COMMANDS_SETTING) === true;
  }

  /** Чи має джерело свій топік (`topic.<source>`); вимкнено — його сповіщення йдуть у загальну стрічку групи. */
  topicEnabled(source: string): boolean {
    return this._read(groupsTopicSetting({ id: source, label: source })) === true;
  }

  private _read(definition: SettingDefinition) {
    return resolveSettingValue(definition, this._settings.get(GROUPS_MODULE, definition.key));
  }
}

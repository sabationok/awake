import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { TelegramNotificationsService } from '../telegram/notifications';
import { APP_UPDATE_MODULE, APP_UPDATE_SEEN_KEY } from './constants/app-update';
import { parseSeenBuild } from './helpers/parse-seen-build';
import { readBuildInfo } from './helpers/read-build-info';
import { updateBody } from './helpers/update-body';
import type { SeenBuild } from './types/seen-build.types';

/**
 * Після встановлення нової збірки агент на першому старті каже про це в Telegram і перелічує зміни, яких власник
 * ще не бачив. Паспорт збірки (`build-info.json`) кладе скрипт збірки; запуск з джерел без паспорта мовчить.
 */
@Injectable()
export class AppUpdateListener implements OnApplicationBootstrap {
  private readonly _logger = new Logger(AppUpdateListener.name);

  constructor(
    private readonly _settings: SettingsService,
    private readonly _notifications: TelegramNotificationsService,
  ) {}

  onApplicationBootstrap() {
    const info = readBuildInfo();
    if (!info) return;
    const seen = parseSeenBuild(this._settings.get(APP_UPDATE_MODULE, APP_UPDATE_SEEN_KEY));
    if (seen?.builtAt === info.builtAt) return;
    const next: SeenBuild = { version: info.version, builtAt: info.builtAt, ids: info.changes.map((change) => change.id) };
    this._settings.set(APP_UPDATE_MODULE, APP_UPDATE_SEEN_KEY, JSON.stringify(next));
    this._logger.log(`Нова збірка ${info.version} (${info.stage}, ${info.commit})`);
    this._notifications.notify({
      source: 'bot',
      type: 'updated',
      title: `⬆️ MaControl оновлено до ${info.version}`,
      body: updateBody(info, seen) || undefined,
      fields: { stage: info.stage, commit: info.commit, built: info.builtAt },
    });
  }
}

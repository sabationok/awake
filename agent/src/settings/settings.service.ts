import { Injectable } from '@nestjs/common';
import type { SettingValue } from '@awake/contracts';
import { SettingsRepository } from './repositories/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly _settings: SettingsRepository) {}

  get(module: string, key: string): SettingValue | undefined {
    return this._settings.get(module, key);
  }

  set(module: string, key: string, value: SettingValue) {
    this._settings.upsert(module, key, value);
  }
}

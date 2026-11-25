import { Injectable } from '@nestjs/common';
import type { SettingValue } from '@awake/contracts';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { SettingsRepository } from './repositories/settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly _settings: SettingsRepository) {}

  get(module: string, key: string): SettingValue | undefined {
    return this._settings.findOne({ module, key }, { select: ['value'] })?.value;
  }

  set(module: string, key: string, value: SettingValue) {
    const dto: UpsertSettingDto = { module, key, value };
    this._settings.upsert(dto, { conflict: ['module', 'key'], update: ['value'] });
  }
}

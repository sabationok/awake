import type { SettingValue } from '@awake/contracts';
import type { SettingEntity } from '../entities/setting.entity';

export class UpsertSettingDto implements SettingEntity {
  module!: string;
  key!: string;
  value!: SettingValue;
}

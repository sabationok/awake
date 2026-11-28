import type { SettingValue } from '@macontrol/contracts';
import type { SettingEntity } from '../entities/setting.entity';

export class UpsertSettingDto implements SettingEntity {
  module!: string;
  key!: string;
  value!: SettingValue;
}

import { EntityRepository, FindManyQueryBase, SqliteRepository } from '@nest-kit/sqlite';
import { SettingEntity } from '../entities/setting.entity';
import { FindOneSettingQuery } from '../query/find-one-setting.query';

@EntityRepository(SettingEntity)
export class SettingsRepository extends SqliteRepository<SettingEntity, FindOneSettingQuery, FindManyQueryBase> {}

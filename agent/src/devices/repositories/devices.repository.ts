import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { DeviceEntity } from '../entities/device.entity';
import { FindManyDevicesQuery } from '../query/find-many-devices.query';
import { FindOneDeviceQuery } from '../query/find-one-device.query';

/** Видалення фізичне: токен одразу перестає діяти, вебсесії пристрою видаляє каскад FK. */
@EntityRepository(DeviceEntity)
export class DevicesRepository extends SqliteRepository<DeviceEntity, FindOneDeviceQuery, FindManyDevicesQuery> {}

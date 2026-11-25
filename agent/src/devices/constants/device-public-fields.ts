import type { SelectOf } from '@nest-kit/sqlite';
import type { DeviceEntity } from '../entities/device.entity';

/** Поля пристрою, які можна віддати Mac-аппці чи Web UI: усе, крім хешу токена. */
export const DEVICE_PUBLIC_FIELDS: SelectOf<DeviceEntity>[] = ['id', 'userAgent', 'createdAt', 'lastSeenAt', 'via'];

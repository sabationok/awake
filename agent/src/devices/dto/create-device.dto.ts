import type { DeviceEntity } from '../entities/device.entity';

export class CreateDeviceDto implements Pick<DeviceEntity, 'tokenHash' | 'userAgent' | 'createdAt' | 'via'> {
  tokenHash!: string;
  userAgent!: string | null;
  createdAt!: string;
  via!: DeviceEntity['via'];
}

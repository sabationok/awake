import type { DevicePairingMode } from '@awake/contracts';
import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyDevicesQuery extends FindManyQueryBase {
  via?: DevicePairingMode;
}

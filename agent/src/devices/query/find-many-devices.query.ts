import type { DevicePairingMode } from '@macontrol/contracts';
import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyDevicesQuery extends FindManyQueryBase {
  via?: DevicePairingMode;
}

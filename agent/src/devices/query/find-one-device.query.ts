import type { DevicePairingMode } from '@awake/contracts';

export class FindOneDeviceQuery {
  id?: number;
  tokenHash?: string;
  via?: DevicePairingMode;
}

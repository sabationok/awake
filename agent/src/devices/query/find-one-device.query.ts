import type { DevicePairingMode } from '@macontrol/contracts';

export class FindOneDeviceQuery {
  id?: number;
  tokenHash?: string;
  via?: DevicePairingMode;
}

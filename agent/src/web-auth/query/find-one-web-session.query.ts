export class FindOneWebSessionQuery {
  id?: string;
  tokenHash?: string;
  deviceId?: number;
  /** `false` — невідкликана. */
  revoked?: boolean;
}

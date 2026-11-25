import type { WebSessionEntity } from '../entities/web-session.entity';

export class CreateWebSessionDto implements Pick<WebSessionEntity, 'id' | 'tokenHash' | 'deviceId' | 'idleMinutes' | 'createdAt' | 'lastActiveAt'> {
  id!: string;
  tokenHash!: string;
  deviceId!: number;
  idleMinutes!: number;
  createdAt!: string;
  lastActiveAt!: string;
}

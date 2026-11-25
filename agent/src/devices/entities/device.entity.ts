import type { DevicePairingMode } from '@awake/contracts';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from '@nest-kit/sqlite';
import { WebSessionEntity } from '../../web-auth/entities/web-session.entity';

@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn() id!: number;
  /** sha256 токена пристрою; назовні не віддається (`DEVICE_PUBLIC_FIELDS`). */
  @Column({ type: 'text' }) tokenHash!: string;
  @Column({ type: 'text', nullable: true }) userAgent!: string | null;
  @Column({ type: 'text' }) createdAt!: string;
  @Column({ type: 'text', nullable: true }) lastSeenAt!: string | null;
  @Column({ type: 'text' }) via!: DevicePairingMode;

  @OneToMany(() => WebSessionEntity, (session) => session.device)
  webSessions?: WebSessionEntity[];
}

import { Column, Entity, Index, ManyToOne, PrimaryColumn, StateDateColumn } from '@nest-kit/sqlite';
import { DeviceEntity } from '../../devices/entities/device.entity';

@Entity('web_sessions')
@Index(['deviceId'], { name: 'web_sessions_device' })
export class WebSessionEntity {
  @PrimaryColumn({ type: 'text' }) id!: string;
  /** sha256 токена сесії. */
  @Column({ type: 'text' }) tokenHash!: string;
  @Column({ type: 'integer' }) deviceId!: number;
  @Column({ type: 'integer' }) idleMinutes!: number;
  @Column({ type: 'text' }) createdAt!: string;
  @Column({ type: 'text' }) lastActiveAt!: string;
  @StateDateColumn() revokedAt!: string | null;

  @ManyToOne(() => DeviceEntity, { joinColumn: 'deviceId', onDelete: 'CASCADE' })
  device?: DeviceEntity | null;
}

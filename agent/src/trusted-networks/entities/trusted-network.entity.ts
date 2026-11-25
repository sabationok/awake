import { Column, Entity, PrimaryColumn } from '@nest-kit/sqlite';

@Entity('trusted_networks')
export class TrustedNetworkEntity {
  @PrimaryColumn({ type: 'text' }) ssid!: string;
  @Column({ type: 'text' }) addedAt!: string;
}

import { Column, Entity, PrimaryGeneratedColumn } from '@nest-kit/sqlite';
import type { ModuleSource } from '../../modules/types/module-source';
import type { BotEventRecord, BotEventType } from '../types/bot-event.types';

@Entity('bot_events')
export class BotEventEntity implements BotEventRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) at!: string;
  @Column({ type: 'text' }) source!: ModuleSource;
  @Column({ type: 'text' }) type!: BotEventType;
  @Column({ type: 'text' }) namespace!: string;
  @Column({ type: 'text' }) name!: string;
  /** Чи вдалася дія — факт події, не стан, тож bool. */
  @Column({ type: 'boolean' }) ok!: boolean;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @Column({ type: 'text', nullable: true }) proxy!: string | null;
}
